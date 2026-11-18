package expo.modules.playassetdelivery

import android.app.Activity
import android.net.Uri
import com.google.android.play.core.assetpacks.AssetPackException
import com.google.android.play.core.assetpacks.AssetPackManager
import com.google.android.play.core.assetpacks.AssetPackManagerFactory
import com.google.android.play.core.assetpacks.AssetPackState
import com.google.android.play.core.assetpacks.AssetPackStateUpdateListener
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File
import org.json.JSONObject

class PlayAssetDeliveryModule : Module() {
  private val manager: AssetPackManager by lazy {
    AssetPackManagerFactory.getInstance(appContext.reactContext ?: throw Exceptions.ReactContextLost())
  }
  private val listener = AssetPackStateUpdateListener { state -> sendEvent("onPackState", stateMap(state)) }

  override fun definition() = ModuleDefinition {
    Name("PlayAssetDelivery")
    Events("onPackState")
    OnCreate { manager.registerListener(listener) }
    OnDestroy { manager.unregisterListener(listener) }

    AsyncFunction("getPackStates") { names: List<String>, promise: Promise ->
      manager.getPackStates(names)
        .addOnSuccessListener { states -> promise.resolve(states.packStates().values.map { stateMap(it) }) }
        .addOnFailureListener { reject(promise, it) }
    }
    AsyncFunction("fetch") { names: List<String>, promise: Promise ->
      manager.fetch(names)
        .addOnSuccessListener { states -> promise.resolve(states.packStates().values.map { stateMap(it) }) }
        .addOnFailureListener { reject(promise, it) }
    }
    AsyncFunction("cancel") { names: List<String> ->
      manager.cancel(names).packStates().values.map { stateMap(it) }
    }
    AsyncFunction("getPackLocation") { name: String -> manager.getPackLocation(name)?.assetsPath() }
    AsyncFunction("checkPackReady") { name: String, expectedManifestHash: String ->
      val root = manager.getPackLocation(name)?.assetsPath()?.let { File(it).canonicalFile }
      if (root == null) false else {
        try {
          val contentManifest = File(root, "content-manifests/$name.json")
          val manifestFile = (if (contentManifest.isFile) contentManifest else File(root, "audio-manifests/$name.json")).canonicalFile
          if (!manifestFile.path.startsWith(root.path + File.separator) || !manifestFile.isFile) false
          else {
            val bytes = manifestFile.readBytes()
            if (!PackFileVerifier.matchesHash(bytes, expectedManifestHash)) false
            else {
              val manifest = JSONObject(bytes.toString(Charsets.UTF_8))
              if (manifest.getInt("schemaVersion") !in listOf(2, 3) || manifest.getString("packName") != name) false
              else {
                val files = manifest.getJSONArray("files")
                if (manifest.getInt("schemaVersion") == 3) {
                  PackFileVerifier.contentFilesReady(root, (0 until files.length()).map { index ->
                    val file = files.getJSONObject(index)
                    PackFileVerifier.ContentAsset(file.getString("relativePath"), file.getLong("bytes"))
                  })
                } else PackFileVerifier.filesReady(root, (0 until files.length()).map { index ->
                  val file = files.getJSONObject(index)
                  PackFileVerifier.Asset(file.getString("audioId"), file.getLong("bytes"))
                })
              }
            }
          }
        } catch (_: Exception) { false }
      }
    }.runOnQueue(Queues.DEFAULT)
    AsyncFunction("resolveAssetUri") { name: String, relativePath: String ->
      val root = manager.getPackLocation(name)?.assetsPath()?.let { File(it).canonicalFile }
      if (root == null) null else {
        val file = File(root, relativePath).canonicalFile
        require(file.path.startsWith(root.path + File.separator)) { "Asset path must stay inside its pack" }
        if (file.isFile && file.length() > 0) Uri.fromFile(file).toString() else null
      }
    }
    AsyncFunction("showConfirmationDialog") { promise: Promise ->
      val activity = appContext.currentActivity
      if (activity == null) promise.reject("PAD_ACTIVITY", "No foreground activity", null)
      else manager.showConfirmationDialog(activity)
        .addOnSuccessListener { result -> promise.resolve(result == Activity.RESULT_OK) }
        .addOnFailureListener { reject(promise, it) }
    }.runOnQueue(Queues.MAIN)
  }

  private fun stateMap(state: AssetPackState): Map<String, Any> = mapOf(
    "name" to state.name(), "status" to state.status(), "errorCode" to state.errorCode(),
    "downloadedBytes" to state.bytesDownloaded().toDouble(), "totalBytes" to state.totalBytesToDownload().toDouble(),
    "transferProgress" to state.transferProgressPercentage()
  )
  private fun reject(promise: Promise, error: Exception) {
    val code = (error as? AssetPackException)?.errorCode ?: 0
    promise.reject("PAD_$code", error.message, error)
  }
}

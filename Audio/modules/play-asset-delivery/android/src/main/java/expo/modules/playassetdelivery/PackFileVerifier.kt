package expo.modules.playassetdelivery

import java.io.File
import java.security.MessageDigest

internal object PackFileVerifier {
  data class Asset(val audioId: String, val bytes: Long)

  fun matchesHash(data: ByteArray, expectedHash: String): Boolean =
    MessageDigest.getInstance("SHA-256").digest(data).joinToString("") { "%02x".format(it) } == expectedHash

  fun filesReady(root: File, files: List<Asset>): Boolean {
    if (files.isEmpty() || files.map { it.audioId }.toSet().size != files.size) return false
    val canonicalRoot = root.canonicalFile
    return files.all { asset ->
      if (!asset.audioId.matches(Regex("^[a-f0-9]{64}$")) || asset.bytes <= 0) false
      else {
        val file = File(canonicalRoot, "${asset.audioId}.mp3").canonicalFile
        file.path.startsWith(canonicalRoot.path + File.separator) && file.isFile && file.length() == asset.bytes
      }
    }
  }
}

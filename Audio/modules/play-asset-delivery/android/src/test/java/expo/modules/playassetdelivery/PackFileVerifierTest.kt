package expo.modules.playassetdelivery

import java.io.File
import java.nio.file.Files
import java.security.MessageDigest
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PackFileVerifierTest {
  @Test fun manifestHashRejectsAnotherVersion() {
    val bytes = "pack manifest v2".toByteArray()
    val hash = MessageDigest.getInstance("SHA-256").digest(bytes).joinToString("") { "%02x".format(it) }
    assertTrue(PackFileVerifier.matchesHash(bytes, hash))
    assertFalse(PackFileVerifier.matchesHash("older manifest".toByteArray(), hash))
  }

  @Test fun readinessRequiresEveryFileWithItsExpectedSize() {
    val root = Files.createTempDirectory("pad-files").toFile()
    try {
      val id = "a".repeat(64)
      val assets = listOf(PackFileVerifier.Asset(id, 3))
      assertFalse(PackFileVerifier.filesReady(root, assets))
      File(root, "$id.mp3").writeBytes(byteArrayOf(1, 2, 3))
      assertTrue(PackFileVerifier.filesReady(root, assets))
      File(root, "$id.mp3").writeBytes(byteArrayOf(1, 2))
      assertFalse(PackFileVerifier.filesReady(root, assets))
      assertFalse(PackFileVerifier.filesReady(root, emptyList()))
      assertFalse(PackFileVerifier.filesReady(root, assets + assets))
      assertFalse(PackFileVerifier.filesReady(root, listOf(PackFileVerifier.Asset("../outside", 3))))
    } finally { root.deleteRecursively() }
  }

  @Test fun symlinkCannotEscapePack() {
    val root = Files.createTempDirectory("pad-root").toFile()
    val outside = Files.createTempFile("pad-outside", ".mp3").toFile()
    try {
      outside.writeBytes(byteArrayOf(1, 2, 3))
      val id = "b".repeat(64)
      Files.createSymbolicLink(File(root, "$id.mp3").toPath(), outside.toPath())
      assertFalse(PackFileVerifier.filesReady(root, listOf(PackFileVerifier.Asset(id, 3))))
    } finally { root.deleteRecursively(); outside.delete() }
  }
  @Test fun contentImagesRequireSafeUniquePathsAndMatchingSizes() {
    val root = Files.createTempDirectory("pad-images").toFile()
    val outside = Files.createTempFile("pad-outside", ".webp").toFile()
    try {
      val image = File(root, "birds/stork.webp")
      image.parentFile!!.mkdirs()
      val assets = listOf(PackFileVerifier.ContentAsset("birds/stork.webp", 3))
      assertFalse(PackFileVerifier.contentFilesReady(root, assets))
      image.writeBytes(byteArrayOf(1, 2, 3))
      assertTrue(PackFileVerifier.contentFilesReady(root, assets))
      assertFalse(PackFileVerifier.contentFilesReady(root, assets + assets))
      assertFalse(PackFileVerifier.contentFilesReady(root, emptyList()))
      image.writeBytes(byteArrayOf(1))
      assertFalse(PackFileVerifier.contentFilesReady(root, assets))
      for (unsafe in listOf("../outside.webp", "/outside.webp", "birds/../stork.webp", "birds\\stork.webp")) {
        assertFalse(PackFileVerifier.contentFilesReady(root, listOf(PackFileVerifier.ContentAsset(unsafe, 3))))
      }
      outside.writeBytes(byteArrayOf(1, 2, 3))
      Files.createSymbolicLink(File(root, "link.webp").toPath(), outside.toPath())
      assertFalse(PackFileVerifier.contentFilesReady(root, listOf(PackFileVerifier.ContentAsset("link.webp", 3))))
    } finally { root.deleteRecursively(); outside.delete() }
  }

}

package expo.modules.vocab2csvprocessor

import android.graphics.BitmapFactory
import android.net.Uri
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.japanese.JapaneseTextRecognizerOptions
import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class Vocab2CSVProcessorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("Vocab2CSVProcessor")

    AsyncFunction("processPhoto") { photoUri: String, promise: Promise ->
      processPhoto(photoUri, promise)
    }
  }

  private fun processPhoto(photoUri: String, promise: Promise) {
    // Parse URI and create file
    val uri: Uri
    val file: File
    try {
      uri = Uri.parse(photoUri)
      file = File(uri.path ?: "")
    } catch (e: Exception) {
      promise.reject("INVALID_URI", "Could not parse photo URI", e)
      return
    }

    if (!file.exists()) {
      promise.reject("INVALID_IMAGE", "Could not load image from URI", null)
      return
    }

    val bitmap = try {
      BitmapFactory.decodeFile(file.absolutePath)
    } catch (e: Exception) {
      promise.reject("DECODE_ERROR", "Could not decode image file", e)
      return
    }

    if (bitmap == null) {
      promise.reject("INVALID_IMAGE", "Could not decode image", null)
      return
    }

    val image = try {
      InputImage.fromBitmap(bitmap, 0)
    } catch (e: Exception) {
      promise.reject("IMAGE_PROCESSING_ERROR", "Could not create input image", e)
      return
    }

    val recognizer = TextRecognition.getClient(JapaneseTextRecognizerOptions.Builder().build())

    recognizer.process(image)
      .addOnSuccessListener { visionText ->
        val extractedText = mutableListOf<String>()
        
        for (block in visionText.textBlocks) {
          for (line in block.lines) {
            extractedText.add(line.text)
          }
        }

        promise.resolve(extractedText)
      }
      .addOnFailureListener { e ->
        promise.reject("VISION_ERROR", e.message ?: "Text recognition failed", e)
      }
  }
}

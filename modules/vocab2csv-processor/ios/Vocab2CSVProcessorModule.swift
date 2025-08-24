import ExpoModulesCore
import Vision
import UIKit

public class Vocab2CSVProcessorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("Vocab2CSVProcessor")

    AsyncFunction("processPhoto") { (photoUri: String, promise: Promise) in
      self.processPhoto(photoUri: photoUri, promise: promise)
    }
  }

  private func processPhoto(photoUri: String, promise: Promise) {
    guard let url = URL(string: photoUri),
          let image = UIImage(contentsOfFile: url.path) else {
      promise.reject("INVALID_IMAGE", "Could not load image from URI")
      return
    }

    guard let cgImage = image.cgImage else {
      promise.reject("INVALID_IMAGE", "Could not get CGImage from UIImage")
      return
    }

    let request = VNRecognizeTextRequest { (request, error) in
      if let error = error {
        promise.reject("VISION_ERROR", error.localizedDescription)
        return
      }
      guard let observations = request.results as? [VNRecognizedTextObservation] else {
        promise.reject("NO_TEXT", "No text found in image")
        return
      }
      var extractedText: [String] = []
      for observation in observations {
        if let topCandidate = observation.topCandidates(1).first {
          extractedText.append(topCandidate.string)
        }
      }
      promise.resolve(extractedText)
    }

    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ja", "en"]
    request.usesLanguageCorrection = true
    request.automaticallyDetectsLanguage = true

    let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
    do {
      try handler.perform([request])
    } catch {
      promise.reject("VISION_ERROR", error.localizedDescription)
    }
  }
}

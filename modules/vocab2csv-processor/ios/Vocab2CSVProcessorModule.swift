import ExpoModulesCore
import Vision
import UIKit

public class Vocab2CSVProcessorModule: Module {
  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  public func definition() -> ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('Vocab2CSVProcessor')` in JavaScript.
    Name("Vocab2CSVProcessor")

    // Sets constant properties on the module. Can take a dictionary or a closure that returns a dictionary.
    Constants([
      "PI": Double.pi
    ])

    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      return "Hello world! 👋"
    }

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { (value: String) in
      // Send an event to JavaScript.
      self.sendEvent("onChange", [
        "value": value
      ])
    }

    // Process flashcard photo and extract English-Japanese word pairs
    AsyncFunction("processPhoto") { (photoUri: String, promise: Promise) in
      self.processPhoto(photoUri: photoUri, promise: promise)
    }

    // Enables the module to be used as a native view. Definition components that are accepted as part of the
    // view definition: Prop, Events.
    View(Vocab2CSVProcessorView.self) {
      // Defines a setter for the `url` prop.
      Prop("url") { (view: Vocab2CSVProcessorView, url: URL) in
        if view.webView.url != url {
          view.webView.load(URLRequest(url: url))
        }
      }

      Events("onLoad")
    }
  }
  
  // Implementation of photo processing using Vision API
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
      
      // Log detailed information about each observation
      print("Vision API found \(observations.count) text observations:")
      
      for (index, observation) in observations.enumerated() {
        let candidates = observation.topCandidates(3) // Get top 3 candidates
        print("Observation \(index + 1):")
        
        for (candidateIndex, candidate) in candidates.enumerated() {
          print("  Candidate \(candidateIndex + 1): '\(candidate.string)' (confidence: \(candidate.confidence))")
        }
        
        if let topCandidate = candidates.first {
          extractedText.append(topCandidate.string)
        }
      }
      
      promise.resolve(extractedText)
    }
    
    // Configure text recognition for better accuracy with Japanese
    request.recognitionLevel = .accurate
    request.recognitionLanguages = ["ja", "en"] // Put Japanese first for better recognition
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

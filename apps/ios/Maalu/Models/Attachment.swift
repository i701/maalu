import Foundation

/// A receipt on a transaction: a photo or a PDF.
struct Attachment: Decodable, Identifiable {
    let id: String
    let filename: String
    let mimeType: String
    let size: Int

    var isPDF: Bool { mimeType == "application/pdf" }
}

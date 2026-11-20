import CoreTransferable
import UniformTypeIdentifiers

/// A photo from the picker with the name the library gave it, which loading plain `Data` throws away.
struct PickedPhoto: Transferable {
    let data: Data
    /// The original name without its extension ("IMG_1234"), if the picker kept one.
    let baseName: String?

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(importedContentType: .image) { received in
            let name = received.file.deletingPathExtension().lastPathComponent
            return PickedPhoto(data: try Data(contentsOf: received.file), baseName: name.isEmpty ? nil : name)
        }
    }
}

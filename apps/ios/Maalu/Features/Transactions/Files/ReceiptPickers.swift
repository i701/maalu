import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// The Add Photo and Add File buttons. Each picked file is handed on with its name and type; a photo is sent as a JPEG
/// and keeps its name apart from the extension (IMG_1234.HEIC becomes IMG_1234.jpg).
struct ReceiptPickers: View {
    /// How many files there are already, so a photo whose name is unknown is called "Photo 3.jpg" after two.
    let count: Int
    let onPick: (Data, String, String) -> Void
    let onProblem: (String) -> Void
    @State private var photos: [PhotosPickerItem] = []
    @State private var isImportingFile = false

    var body: some View {
        PhotosPicker("Add Photo", selection: $photos, maxSelectionCount: PendingAttachment.maxCount, matching: .images)
            .onChange(of: photos) { Task { await addPhotos() } }
        Button("Add File", systemImage: "doc.badge.plus") { isImportingFile = true }
            .fileImporter(isPresented: $isImportingFile, allowedContentTypes: [.pdf, .jpeg, .png, .webP], allowsMultipleSelection: true, onCompletion: addFiles)
    }

    private func addPhotos() async {
        guard !photos.isEmpty else { return }
        let picked = photos
        photos = []
        for (offset, item) in picked.enumerated() {
            guard let photo = try? await item.loadTransferable(type: PickedPhoto.self), let jpeg = ReceiptImage.jpeg(from: photo.data) else {
                onProblem(String(localized: "A photo could not be read."))
                continue
            }
            let name = photo.baseName.map { "\($0).jpg" } ?? String(localized: "Photo \(count + offset + 1).jpg")
            onPick(jpeg, name, "image/jpeg")
        }
    }

    private func addFiles(_ result: Result<[URL], Error>) {
        guard case .success(let urls) = result else {
            onProblem(String(localized: "The file could not be opened."))
            return
        }
        for url in urls {
            let isScoped = url.startAccessingSecurityScopedResource()
            defer { if isScoped { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else {
                onProblem(String(localized: "\(url.lastPathComponent) could not be read."))
                continue
            }
            let type = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            onPick(data, url.lastPathComponent, type)
        }
    }
}

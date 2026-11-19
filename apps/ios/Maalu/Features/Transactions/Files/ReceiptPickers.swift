import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

/// The Add Photo and Add File buttons. Each picked file is handed on with its name and type; a photo is sent as a JPEG.
struct ReceiptPickers: View {
    /// How many files there are already, so a photo is named "Photo 3.jpg" after two.
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
            guard let data = try? await item.loadTransferable(type: Data.self), let jpeg = ReceiptImage.jpeg(from: data) else {
                onProblem(String(localized: "A photo could not be read."))
                continue
            }
            onPick(jpeg, String(localized: "Photo \(count + offset + 1).jpg"), "image/jpeg")
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

import PhotosUI
import SwiftUI
import UniformTypeIdentifiers

struct TransactionAttachmentsSection: View {
    let model: TransactionFormModel
    @State private var photos: [PhotosPickerItem] = []
    @State private var isImportingFile = false
    @State private var problem: String?

    var body: some View {
        Section {
            ForEach(model.pending) { file in
                Label(file.filename, systemImage: file.contentType == "application/pdf" ? "doc" : "photo")
                    .swipeActions { Button("Remove", systemImage: "trash", role: .destructive) { model.removeAttachment(file) } }
            }
            PhotosPicker("Add Photo", selection: $photos, maxSelectionCount: PendingAttachment.maxCount, matching: .images)
            Button("Add File", systemImage: "doc.badge.plus") { isImportingFile = true }
        } header: {
            Text("Receipts")
        } footer: {
            if let problem {
                Text(problem).foregroundStyle(.red)
            } else {
                Text("Photos or PDFs, up to 10 MB each. They upload when you save.")
            }
        }
        .onChange(of: photos) { Task { await addPhotos() } }
        .fileImporter(isPresented: $isImportingFile, allowedContentTypes: [.pdf, .jpeg, .png, .webP], allowsMultipleSelection: true, onCompletion: addFiles)
    }

    private func addPhotos() async {
        guard !photos.isEmpty else { return }
        let picked = photos
        photos = []
        problem = nil
        for item in picked {
            guard let data = try? await item.loadTransferable(type: Data.self), let jpeg = ReceiptImage.jpeg(from: data) else {
                problem = String(localized: "A photo could not be read.")
                continue
            }
            add(jpeg, filename: String(localized: "Photo \(model.pending.count + 1).jpg"), contentType: "image/jpeg")
        }
    }

    private func addFiles(_ result: Result<[URL], Error>) {
        problem = nil
        guard case .success(let urls) = result else {
            problem = String(localized: "The file could not be opened.")
            return
        }
        for url in urls {
            let isScoped = url.startAccessingSecurityScopedResource()
            defer { if isScoped { url.stopAccessingSecurityScopedResource() } }
            guard let data = try? Data(contentsOf: url) else {
                problem = String(localized: "\(url.lastPathComponent) could not be read.")
                continue
            }
            let type = UTType(filenameExtension: url.pathExtension)?.preferredMIMEType ?? "application/octet-stream"
            add(data, filename: url.lastPathComponent, contentType: type)
        }
    }

    private func add(_ data: Data, filename: String, contentType: String) {
        if let refusal = model.attach(data, filename: filename, contentType: contentType) {
            problem = String(localized: refusal)
        }
    }
}

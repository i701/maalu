import SwiftUI

struct TransactionAttachmentsSection: View {
    let model: TransactionFormModel
    @State private var problem: String?
    @State private var isAddingLink = false
    @State private var typedLink = ""

    var body: some View {
        Section {
            ForEach(model.pending) { file in
                Label(file.filename, systemImage: file.contentType == "application/pdf" ? "doc" : "photo")
                    .swipeActions { Button("Remove", systemImage: "trash", role: .destructive) { model.removeAttachment(file) } }
            }
            ForEach(model.pendingLinks) { link in
                Label(link.url, systemImage: "link")
                    .lineLimit(1)
                    .swipeActions { Button("Remove", systemImage: "trash", role: .destructive) { model.removeLink(link) } }
            }
            ReceiptPickers(count: model.pending.count, onPick: add, onProblem: show)
            Button("Add Link", systemImage: "link.badge.plus") { isAddingLink = true }
        } header: {
            Text("Receipts and links")
        } footer: {
            if let problem {
                Text(problem).foregroundStyle(.red)
            } else {
                Text("Photos or PDFs, up to 10 MB each, and web links. They are added when you save.")
            }
        }
        .alert("Add Link", isPresented: $isAddingLink) {
            TextField("Web address", text: $typedLink)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Add", action: addLink)
            Button("Cancel", role: .cancel) { typedLink = "" }
        }
    }

    private func add(_ data: Data, filename: String, contentType: String) {
        problem = model.attach(data, filename: filename, contentType: contentType).map { String(localized: $0) }
    }

    private func show(_ message: String) {
        problem = message
    }

    private func addLink() {
        problem = model.addLink(typedLink).map { String(localized: $0) }
        typedLink = ""
    }
}

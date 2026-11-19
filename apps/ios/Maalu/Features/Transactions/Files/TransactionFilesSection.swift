import QuickLook
import SwiftUI

/// A saved transaction's receipts and links: tap one to open it, swipe to remove it, and add more unless it is in the trash.
struct TransactionFilesSection: View {
    @Environment(Session.self) private var session
    @Bindable var model: TransactionFilesModel
    let canAdd: Bool
    @State private var isAddingLink = false
    @State private var typedLink = ""

    var body: some View {
        Section {
            ForEach(model.attachments) { file in
                Button { open(file) } label: {
                    AmountRow {
                        Label(file.filename, systemImage: file.isPDF ? "doc" : "photo")
                    } amount: {
                        Text(Int64(file.size), format: .byteCount(style: .file)).foregroundStyle(.secondary)
                    }
                }
                .foregroundStyle(.primary)
                .swipeActions { Button("Remove", systemImage: "trash", role: .destructive) { remove(file) } }
            }
            ForEach(model.links) { link in
                if let url = URL(string: link.url) {
                    Link(destination: url) {
                        VStack(alignment: .leading) {
                            Label(link.title ?? link.site ?? link.url, systemImage: "link").lineLimit(1)
                            if link.title != nil, let site = link.site {
                                Text(site).font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                    }
                    .swipeActions { Button("Remove", systemImage: "trash", role: .destructive) { remove(link) } }
                }
            }
            if canAdd {
                if model.canAddFile {
                    ReceiptPickers(count: model.attachments.count, onPick: upload, onProblem: show)
                }
                if model.canAddLink {
                    Button("Add Link", systemImage: "link.badge.plus") { isAddingLink = true }
                }
            }
        } header: {
            Text("Receipts and links")
        } footer: {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            } else if model.attachments.isEmpty && model.links.isEmpty {
                Text(canAdd ? "Photos or PDFs, up to 10 MB each, and web links." : "None.")
            }
        }
        .disabled(model.isBusy)
        .quickLookPreview($model.previewURL)
        .alert("Add Link", isPresented: $isAddingLink) {
            TextField("Web address", text: $typedLink)
                .keyboardType(.URL)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
            Button("Add", action: addLink)
            Button("Cancel", role: .cancel) { typedLink = "" }
        }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func open(_ file: Attachment) {
        Task {
            guard let api = session.api else { return }
            await model.open(file, using: api)
        }
    }

    private func upload(_ data: Data, filename: String, contentType: String) {
        Task {
            guard let api = session.api else { return }
            await model.upload(data, filename: filename, contentType: contentType, using: api)
        }
    }

    private func show(_ message: String) {
        model.errorMessage = message
    }

    private func addLink() {
        let typed = typedLink
        typedLink = ""
        Task {
            guard let api = session.api else { return }
            await model.addLink(typed, using: api)
        }
    }

    private func remove(_ file: Attachment) {
        Task {
            guard let api = session.api else { return }
            await model.remove(file, using: api)
        }
    }

    private func remove(_ link: TransactionLink) {
        Task {
            guard let api = session.api else { return }
            await model.remove(link, using: api)
        }
    }
}

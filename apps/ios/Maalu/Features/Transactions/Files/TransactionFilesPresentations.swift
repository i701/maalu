import QuickLook
import SwiftUI

/// The Quick Look preview, the Add Link alert and the first load of a transaction's files. They go on the list once:
/// on a `Section` a List repeats a modifier for every row, and a preview presented by each row dismisses the sheet.
struct TransactionFilesPresentations: ViewModifier {
    @Environment(Session.self) private var session
    @Bindable var model: TransactionFilesModel

    func body(content: Content) -> some View {
        content
            .quickLookPreview($model.previewURL)
            .alert("Add Link", isPresented: $model.isAddingLink) {
                TextField("Web address", text: $model.typedLink)
                    .keyboardType(.URL)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                Button("Add", action: addLink)
                Button("Cancel", role: .cancel) { model.typedLink = "" }
            }
            .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func addLink() {
        let typed = model.typedLink
        model.typedLink = ""
        Task {
            guard let api = session.api else { return }
            await model.addLink(typed, using: api)
        }
    }
}

extension View {
    func transactionFilesPresentations(_ model: TransactionFilesModel) -> some View {
        modifier(TransactionFilesPresentations(model: model))
    }
}

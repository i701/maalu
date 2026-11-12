import SwiftUI

struct TransactionDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: TransactionsModel
    let id: String
    @State private var editing: Transaction?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let transaction = model.transaction(id: id) {
            TransactionDetailContent(transaction: transaction)
                .navigationTitle(transaction.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if transaction.canEdit {
                        ToolbarItem(placement: .primaryAction) {
                            Button("Edit", systemImage: "pencil") { editing = transaction }
                        }
                    }
                    ToolbarItem {
                        Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
                            .confirmationDialog("Delete this transaction?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                                Button("Delete", role: .destructive, action: delete)
                            } message: {
                                Text("It moves to the trash.")
                            }
                    }
                }
                .sheet(item: $editing) { transaction in
                    TransactionFormView(editing: transaction, onSaved: reload)
                }
                .alert("Could not delete", item: $errorMessage) { _ in
                } message: { message in
                    Text(message)
                }
        } else {
            ContentUnavailableView("Transaction not found", systemImage: "questionmark.circle")
        }
    }

    private func reload() {
        Task {
            guard let api = session.api else { return }
            await model.reload(using: api)
        }
    }

    private func delete() {
        Task {
            guard let api = session.api else { return }
            if let message = await model.delete(id: id, using: api) {
                errorMessage = message
            } else {
                dismiss()
            }
        }
    }
}

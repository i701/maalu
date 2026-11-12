import SwiftUI

struct TransactionDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: TransactionsModel
    let id: String
    @State private var sheet: TransactionSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let transaction = model.transaction(id: id) {
            TransactionDetailContent(transaction: transaction)
                .navigationTitle(transaction.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    if transaction.planned {
                        ToolbarItem(placement: .primaryAction) {
                            Button(markTitle(for: transaction), systemImage: "checkmark.circle") { sheet = .pay(transaction) }
                        }
                    }
                    if transaction.canEdit {
                        ToolbarItem(placement: .primaryAction) {
                            Button("Edit", systemImage: "pencil") { sheet = .edit(transaction) }
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
                .sheet(item: $sheet) { sheet in
                    switch sheet {
                    case .edit(let transaction): TransactionFormView(editing: transaction, onSaved: reload)
                    case .pay(let transaction): MarkPaidView(transactionID: transaction.id, onDone: paid)
                    }
                }
                .alert("Could not delete", item: $errorMessage) { _ in
                } message: { message in
                    Text(message)
                }
        } else {
            ContentUnavailableView("Transaction not found", systemImage: "questionmark.circle")
        }
    }

    private func markTitle(for transaction: Transaction) -> LocalizedStringResource {
        switch transaction.type {
        case .transfer: "Mark as done"
        case .income: "Mark as received"
        case .expense: "Mark as paid"
        }
    }

    /// A planned transaction that was paid is a different row now, so the screen about it closes.
    private func paid() {
        Task {
            if let api = session.api { await model.reload(using: api) }
            dismiss()
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

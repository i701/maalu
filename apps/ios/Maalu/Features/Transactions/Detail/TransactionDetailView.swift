import SwiftUI

struct TransactionDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: TransactionsModel
    let id: String
    @State private var sheet: TransactionSheet?
    @State private var dialog = MarkPaidDialogModel()
    @State private var isConfirmingDelete = false
    @State private var transferMatches: [Transaction] = []
    @State private var errorMessage: String?
    @State private var files: TransactionFilesModel

    init(model: TransactionsModel, id: String) {
        self.model = model
        self.id = id
        _files = State(initialValue: TransactionFilesModel(transactionID: id))
    }

    var body: some View {
        if let transaction = model.transaction(id: id) {
            TransactionDetailContent(transaction: transaction, files: files) {
                TransactionQuickActions(
                    transaction: transaction,
                    onMarkPaid: { markPaid(transaction) },
                    onEdit: { sheet = .edit(transaction) },
                    onDuplicate: { sheet = .duplicate(transaction) },
                    onDelete: { isConfirmingDelete = true }
                )
            } actions: {
                TransactionActionsSection(
                    transaction: transaction,
                    onRefund: { sheet = .refund(transaction) },
                    onEditRefund: { sheet = .editRefund(transaction) },
                    onLinkRefund: { sheet = .linkRefund(transaction) },
                    onMakeSubscription: { sheet = .makeSubscription(transaction) },
                    onSplitSalary: { sheet = .splitSalary(transaction) },
                    transferMatches: transferMatches.count,
                    onLinkTransfer: { sheet = .linkTransfer(transaction) }
                )
            }
                .navigationTitle(transaction.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done", action: dismiss.callAsFunction)
                    }
                }
                .confirmationDialog("Delete this transaction?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                    Button("Delete", role: .destructive, action: delete)
                } message: {
                    Text("It moves to the trash.")
                }
                .sheet(item: $sheet) { sheet in
                    switch sheet {
                    case .edit(let transaction): TransactionFormView(editing: transaction, onSaved: reload)
                    case .duplicate(let transaction): TransactionFormView(duplicating: transaction, onSaved: reload)
                    case .refund(let purchase): RefundFormView(purchase: purchase, onSaved: reload)
                    case .editRefund(let refund): RefundFormView(refund: refund, onSaved: reload)
                    case .linkRefund(let income): LinkRefundView(income: income, onSaved: reload)
                    case .makeSubscription(let payment): MakeSubscriptionView(transaction: payment, onSaved: reload)
                    case .splitSalary(let salary): SalarySplitView(transactionID: salary.id, onChanged: reload)
                    case .linkTransfer(let entry): TransferCandidatesView(base: entry, matches: transferMatches, onLinked: linked)
                    }
                }
                .markPaidDialog(dialog, session: session)
                .task(id: transaction.id) { await loadTransferMatches(for: transaction) }
                .alert("Could not delete", item: $errorMessage) { _ in
                } message: { message in
                    Text(message)
                }
        } else {
            ContentUnavailableView("Transaction not found", systemImage: "questionmark.circle")
        }
    }

    private func markPaid(_ transaction: Transaction) {
        Task {
            guard let api = session.api else { return }
            await dialog.present(transactionID: transaction.id, using: api, onDone: paid)
        }
    }

    /// A planned transaction that was paid is a different row now, so the screen about it closes.
    private func paid() {
        Task {
            if let api = session.api { await model.reload(using: api) }
            dismiss()
        }
    }

    /// Only an entry that could be half of a transfer asks, and the merge is only offered when something matches.
    private func loadTransferMatches(for transaction: Transaction) async {
        guard TransferLinkRules.canLink(transaction), let api = session.api else { return }
        let result: ApiResult<[Transaction]> = await api.get("transactions/\(transaction.id)/transfer-candidates")
        if case .ok(let found, _) = result { transferMatches = found }
    }

    /// The income went to the trash and the expense is a transfer now, so the screen about either closes.
    private func linked() {
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

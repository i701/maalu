import SwiftUI

/// What can be done with a transaction, as labelled rows at the end of its detail sheet.
struct TransactionActionsSection: View {
    let transaction: Transaction
    let onMarkPaid: () -> Void
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onRefund: () -> Void
    let onEditRefund: () -> Void
    let onLinkRefund: () -> Void
    let onMakeSubscription: () -> Void
    let onSplitSalary: () -> Void
    /// How many entries could be the other half of this one as a transfer.
    let transferMatches: Int
    let onLinkTransfer: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Section {
            if transaction.planned {
                Button(markTitle, systemImage: "checkmark.circle", action: onMarkPaid)
            }
            if transaction.canEdit {
                Button("Edit", systemImage: "pencil", action: onEdit)
                Button("Duplicate", systemImage: "plus.square.on.square", action: onDuplicate)
            }
            if transaction.isRefundable {
                Button("Refund", systemImage: "arrow.uturn.backward", action: onRefund)
            }
            if transaction.canEditRefund {
                Button("Edit refund", systemImage: "pencil", action: onEditRefund)
            }
            if transaction.isLinkableAsRefund {
                Button("Link to a purchase", systemImage: "link", action: onLinkRefund)
            }
            if transaction.canSplitSalary {
                Button("Split salary", systemImage: "arrow.triangle.branch", action: onSplitSalary)
            }
            if transferMatches > 0 {
                Button(TransferLinkRules.mergeLabel(transferMatches), systemImage: "arrow.left.arrow.right", action: onLinkTransfer)
            }
            if transaction.canMakeSubscription {
                Button("Make a subscription", systemImage: "repeat", action: onMakeSubscription)
            }
            Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
        }
    }

    private var markTitle: LocalizedStringResource {
        switch transaction.type {
        case .transfer: "Mark as done"
        case .income: "Mark as received"
        case .expense: "Mark as paid"
        }
    }
}

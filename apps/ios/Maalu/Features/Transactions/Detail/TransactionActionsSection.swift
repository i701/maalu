import SwiftUI

/// The less common things to do with a transaction, as rows with coloured icons: refunds, splitting pay, merging into a transfer, making a subscription.
struct TransactionActionsSection: View {
    let transaction: Transaction
    let onRefund: () -> Void
    let onEditRefund: () -> Void
    let onLinkRefund: () -> Void
    let onMakeSubscription: () -> Void
    let onSplitSalary: () -> Void
    /// How many entries could be the other half of this one as a transfer.
    let transferMatches: Int
    let onLinkTransfer: () -> Void

    var body: some View {
        if hasAny {
            Section {
                if transaction.isRefundable {
                    TransactionActionRow(title: String(localized: "Refund"), systemImage: "arrow.uturn.backward", tint: .orange, action: onRefund)
                }
                if transaction.canEditRefund {
                    TransactionActionRow(title: String(localized: "Edit refund"), systemImage: "pencil", tint: .orange, action: onEditRefund)
                }
                if transaction.isLinkableAsRefund {
                    TransactionActionRow(title: String(localized: "Link to a purchase"), systemImage: "link", tint: .orange, action: onLinkRefund)
                }
                if transaction.canSplitSalary {
                    TransactionActionRow(title: String(localized: "Split salary"), systemImage: "arrow.triangle.branch", tint: .success, action: onSplitSalary)
                }
                if transferMatches > 0 {
                    TransactionActionRow(title: TransferLinkRules.mergeLabel(transferMatches), systemImage: "arrow.left.arrow.right", tint: .brand, action: onLinkTransfer)
                }
                if transaction.canMakeSubscription {
                    TransactionActionRow(title: String(localized: "Make a subscription"), systemImage: "repeat", tint: .purple, action: onMakeSubscription)
                }
            }
        }
    }

    private var hasAny: Bool {
        transaction.isRefundable || transaction.canEditRefund || transaction.isLinkableAsRefund || transaction.canSplitSalary
            || transferMatches > 0 || transaction.canMakeSubscription
    }
}

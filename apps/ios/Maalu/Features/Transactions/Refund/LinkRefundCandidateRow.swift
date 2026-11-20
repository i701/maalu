import SwiftUI

/// A purchase the income could be a refund of: what it cost, when, and how much is left to refund.
struct LinkRefundCandidateRow: View {
    let purchase: Transaction
    let isChosen: Bool
    let onChoose: () -> Void

    var body: some View {
        Button(action: onChoose) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(purchase.title).foregroundStyle(.primary)
                    Text(facts).font(.subheadline).foregroundStyle(.secondary)
                }
                Spacer()
                if isChosen { Image(systemName: "checkmark").foregroundStyle(.tint) }
            }
        }
        .accessibilityAddTraits(isChosen ? .isSelected : [])
    }

    /// "30 Nov · MVR 100.00 · MVR 40.00 left".
    private var facts: String {
        let day = ISODate.date(purchase.transactionDate)?.formatted(.dateTime.day().month(.abbreviated)) ?? purchase.transactionDate
        let left = RefundRules.left(purchase.amount, refunded: purchase.refundedAmount)
        return "\(day) · \(MoneyFormat.string(purchase.amount, currency: purchase.currency)) · \(MoneyFormat.string(left, currency: purchase.currency)) left"
    }
}

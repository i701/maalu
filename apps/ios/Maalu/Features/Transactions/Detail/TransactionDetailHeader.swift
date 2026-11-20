import SwiftUI

/// The top of the detail sheet: its category, its title, the amount big and in colour, when it was, a few labels, and the main actions as pills.
struct TransactionDetailHeader<Quick: View>: View {
    let transaction: Transaction
    @ViewBuilder let quickActions: Quick

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            TransactionCategoryLabel(text: transaction.rowTag, tint: transaction.tint)
            Text(transaction.rowTitle)
                .font(.title3.weight(.semibold))
            TransactionAmount(transaction: transaction)
                .font(.largeTitle)
            if let when {
                Text(when)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if hasLabels {
                HStack(spacing: 6) {
                    if transaction.planned { TransactionStatusPill(transaction: transaction) }
                    if transaction.isRefund { TransactionDetailChip(text: String(localized: "Refund"), tint: .orange) }
                    if RefundRules.refunded(transaction) > 0 {
                        TransactionDetailChip(text: RefundRules.canRefund(transaction) ? String(localized: "Partly refunded") : String(localized: "Fully refunded"), tint: .orange)
                    }
                }
            }
            ScrollView(.horizontal) {
                HStack(spacing: 8) { quickActions }
            }
            .scrollIndicators(.hidden)
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var hasLabels: Bool {
        transaction.planned || transaction.isRefund || RefundRules.refunded(transaction) > 0
    }

    private var when: String? {
        guard let date = ISODate.date(transaction.transactionDate) else { return nil }
        let day = date.formatted(.dateTime.weekday(.wide).day().month(.wide).year())
        guard let time = transaction.transactionTime else { return day }
        return "\(day), \(time.prefix(5))"
    }
}

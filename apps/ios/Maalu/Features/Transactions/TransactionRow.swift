import SwiftUI

/// The title with its category under it behind a coloured dot, and the amount; a planned one adds a pill under the amount.
struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.rowTitle)
                    .fontWeight(.medium)
                    .lineLimit(1)
                TransactionCategoryLabel(text: transaction.rowTag, tint: transaction.tint)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .trailing, spacing: 2) {
                TransactionAmount(transaction: transaction)
                if transaction.planned {
                    TransactionStatusPill(transaction: transaction)
                }
            }
            .fixedSize()
        }
        .accessibilityElement(children: .combine)
    }
}

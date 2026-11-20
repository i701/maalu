import SwiftUI

/// Four things: a tile, the title, one muted line and the amount; a planned one adds a pill under the amount.
struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        HStack(spacing: 12) {
            TransactionTile(type: transaction.type)
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.rowTitle)
                    .fontWeight(.semibold)
                    .lineLimit(1)
                Text(transaction.rowLine)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            VStack(alignment: .trailing, spacing: 4) {
                TransactionAmount(transaction: transaction)
                if transaction.planned {
                    TransactionStatusPill(transaction: transaction)
                }
            }
            .fixedSize()
        }
        .padding(.vertical, 6)
        .accessibilityElement(children: .combine)
    }
}

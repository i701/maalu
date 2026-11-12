import SwiftUI

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(transaction.title)
                Text(transaction.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            TransactionAmount(transaction: transaction)
        }
    }
}

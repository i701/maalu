import SwiftUI

struct TransactionRow: View {
    let transaction: Transaction

    var body: some View {
        LabeledContent {
            TransactionAmount(transaction: transaction)
        } label: {
            VStack(alignment: .leading) {
                Text(transaction.title)
                Text(transaction.subtitle)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

import SwiftUI

struct TransactionsPreviewSection: View {
    let title: LocalizedStringResource
    let transactions: [Transaction]
    let emptyText: LocalizedStringResource

    var body: some View {
        Section {
            if transactions.isEmpty {
                Text(emptyText).foregroundStyle(.secondary)
            }
            ForEach(transactions) { transaction in
                TransactionRow(transaction: transaction)
            }
        } header: {
            Text(title)
        }
    }
}

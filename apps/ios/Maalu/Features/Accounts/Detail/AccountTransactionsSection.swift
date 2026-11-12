import SwiftUI

struct AccountTransactionsSection: View {
    let transactions: [Transaction]
    let balances: [String: String]
    let account: Account

    var body: some View {
        Section("Latest transactions") {
            if transactions.isEmpty {
                Text("Nothing here yet.").foregroundStyle(.secondary)
            }
            ForEach(transactions) { transaction in
                VStack(alignment: .leading, spacing: 2) {
                    TransactionRow(transaction: transaction)
                    if let balance = balances[transaction.id] {
                        Text("Balance \(MoneyFormat.string(balance, currency: account.currency))")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

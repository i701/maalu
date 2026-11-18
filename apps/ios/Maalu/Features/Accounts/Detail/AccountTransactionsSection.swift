import SwiftUI

struct AccountTransactionsSection: View {
    let model: AccountDetailModel
    let account: Account
    let loadMore: () -> Void

    var body: some View {
        Section("Transactions") {
            if model.transactions.isEmpty, !model.isLoading {
                Text(model.query.isEmpty ? "Nothing here yet." : "No matching transactions.").foregroundStyle(.secondary)
            }
            ForEach(model.transactions) { transaction in
                VStack(alignment: .leading, spacing: 2) {
                    TransactionRow(transaction: transaction)
                    if let balance = model.balances[transaction.id] {
                        Text("Balance \(MoneyFormat.string(balance, currency: account.currency))")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            if model.hasMore {
                if model.pageFailed {
                    Button("Try again", action: loadMore)
                } else {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .onAppear(perform: loadMore)
                }
            }
        }
    }
}

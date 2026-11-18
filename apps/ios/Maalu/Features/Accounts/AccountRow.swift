import SwiftUI

struct AccountRow: View {
    let account: Account
    let trend: [Double]?

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(account.name)
                if let bank = account.bank {
                    Text(bank)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                if let usage = CreditUsage(balance: account.balance, limit: account.creditLimit) {
                    CreditUsageBar(usage: usage, currency: account.currency)
                }
            }
        } amount: {
            VStack(alignment: .trailing) {
                MoneyText(account.balance, currency: account.currency)
                if let trend, trend.count > 1 {
                    AccountSparkline(values: trend)
                }
            }
        }
    }
}

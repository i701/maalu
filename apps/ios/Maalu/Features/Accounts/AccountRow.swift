import SwiftUI

struct AccountRow: View {
    let account: Account
    let trend: [Double]?
    let statement: CardStatement?

    var body: some View {
        AmountRow(alignment: .center) {
            VStack(alignment: .leading) {
                HStack(spacing: 8) {
                    Text(account.name)
                    if let bank = account.bank {
                        AccountBankChip(bank: bank)
                    }
                }
                if let trend, trend.count > 1 {
                    AccountSparkline(values: trend)
                }
                if let statement {
                    Text(CardStatementText.line(statement))
                        .font(.subheadline)
                        .foregroundStyle(statement.state == .overdue ? Color.red : Color.secondary)
                }
                if let usage = CreditUsage(balance: account.balance, limit: account.creditLimit) {
                    CreditUsageBar(usage: usage, currency: account.currency)
                }
            }
        } amount: {
            MoneyText(account.balance, currency: account.currency)
                .font(.title3.weight(.semibold))
        }
    }
}

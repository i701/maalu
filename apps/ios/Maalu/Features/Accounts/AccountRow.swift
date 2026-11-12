import SwiftUI

struct AccountRow: View {
    let account: Account

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(account.name)
                if let bank = account.bank {
                    Text(bank)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        } amount: {
            Text(Money.decimal(account.balance) ?? 0, format: .currency(code: account.currency).presentation(.isoCode))
                .monospacedDigit()
        }
    }
}

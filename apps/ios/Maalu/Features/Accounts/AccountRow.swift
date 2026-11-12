import SwiftUI

struct AccountRow: View {
    let account: Account

    var body: some View {
        LabeledContent {
            Text(Money.decimal(account.balance) ?? 0, format: .currency(code: account.currency).presentation(.isoCode))
                .monospacedDigit()
        } label: {
            VStack(alignment: .leading) {
                Text(account.name)
                Text([account.bank, account.group.capitalized].compactMap { $0 }.joined(separator: " · "))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

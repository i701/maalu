import SwiftUI

struct NetWorthAccountRow: View {
    let account: NetWorthAccountChange
    let currency: String

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(account.name)
                if let group = AccountGroup(rawValue: account.group) {
                    Text(group.title)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
        } amount: {
            VStack(alignment: .trailing) {
                MoneyText(account.endValue, currency: currency)
                SignedMoneyText(value: account.changeValue, currency: currency)
                    .font(.footnote)
            }
        }
    }
}

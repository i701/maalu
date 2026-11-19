import SwiftUI

struct NetWorthDriverRow: View {
    let driver: NetWorthDriver
    let currency: String

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(driver.key.title)
                Text(driver.key.help)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            SignedMoneyText(value: driver.value, currency: currency)
        }
    }
}

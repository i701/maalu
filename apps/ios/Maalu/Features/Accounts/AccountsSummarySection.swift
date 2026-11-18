import SwiftUI

struct AccountsSummarySection: View {
    let summary: AccountSummary

    var body: some View {
        Section {
            AmountRow { Text("Assets") } amount: { MoneyText(summary.assets, currency: summary.currency) }
            AmountRow { Text("Liabilities") } amount: { MoneyText(summary.liabilities, currency: summary.currency) }
            AmountRow { Text("Net worth").bold() } amount: { MoneyText(summary.total, currency: summary.currency).bold() }
        }
    }
}

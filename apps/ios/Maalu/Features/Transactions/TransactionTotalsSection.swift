import SwiftUI

struct TransactionTotalsSection: View {
    let totals: TransactionTotals

    var body: some View {
        Section("Matching transactions") {
            AmountRow { Text("In") } amount: { MoneyText(totals.income, currency: totals.currency) }
            AmountRow { Text("Out") } amount: { MoneyText(totals.expense, currency: totals.currency) }
        }
    }
}

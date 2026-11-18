import SwiftUI

struct AccountMonthSection: View {
    let month: TransactionTotals

    var body: some View {
        Section("This month") {
            AmountRow { Text("In") } amount: { MoneyText(month.income, currency: month.currency) }
            AmountRow { Text("Out") } amount: { MoneyText(month.expense, currency: month.currency) }
        }
    }
}

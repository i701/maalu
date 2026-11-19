import SwiftUI

/// The cash flow charts' numbers, newest month first.
struct CashFlowTableView: View {
    let months: [KeptMonth]
    let currency: String

    var body: some View {
        List(months.reversed()) { month in
            Section {
                AmountRow { Text("Income") } amount: { MoneyText(month.point.incomeValue, currency: currency) }
                AmountRow { Text("Expenses") } amount: { MoneyText(month.point.expenseValue, currency: currency) }
                AmountRow { Text("Kept") } amount: { MoneyText(month.kept, currency: currency) }
                AmountRow { Text("Kept in total") } amount: { MoneyText(month.running, currency: currency) }
            } header: {
                if let start = month.point.start {
                    Text(start, format: .dateTime.month(.wide).year())
                }
            }
        }
        .navigationTitle("Cash Flow")
        .navigationSubtitle("The last \(months.count) months")
    }
}

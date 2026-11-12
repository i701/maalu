import SwiftUI

struct BudgetProgressRow: View {
    let title: String
    let spent: String
    let limit: String
    let currency: String
    let percent: Int
    let status: String

    var body: some View {
        VStack(alignment: .leading) {
            AmountRow {
                Text(title)
            } amount: {
                Text("\(MoneyFormat.string(spent, currency: currency)) / \(MoneyFormat.string(limit, currency: currency))")
                    .monospacedDigit()
            }
            ProgressView(value: min(Double(percent) / 100, 1))
                .tint(Color(budgetStatus: status))
                .accessibilityLabel(title)
                .accessibilityValue("\(percent)%")
        }
    }
}

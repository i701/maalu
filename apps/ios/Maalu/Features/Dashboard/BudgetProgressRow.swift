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
                VStack(alignment: .leading) {
                    Text(title)
                    Text("\(MoneyFormat.string(spent, currency: currency)) of \(MoneyFormat.string(limit, currency: currency))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } amount: {
                Text("\(percent)%")
                    .monospacedDigit()
                    .foregroundStyle(status == "ok" ? Color.secondary : Color(budgetStatus: status))
            }
            ProgressView(value: min(Double(percent) / 100, 1))
                .tint(Color(budgetStatus: status))
                .accessibilityLabel(title)
                .accessibilityValue("\(percent)%")
        }
    }
}

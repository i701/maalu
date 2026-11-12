import SwiftUI

struct BudgetLineRow: View {
    let line: BudgetLine
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            AmountRow {
                Text(line.name)
            } amount: {
                Text("\(line.percent)%").monospacedDigit()
            }
            if let runs = BudgetText.runs(from: line.runsFrom, until: line.runsUntil) {
                Text(runs).font(.subheadline).foregroundStyle(.secondary)
            }
            ProgressView(value: min(Double(line.percent) / 100, 1))
                .tint(Color(budgetStatus: line.status))
                .accessibilityLabel(line.name)
                .accessibilityValue("\(line.percent)%")
            Text("\(MoneyFormat.string(line.activity, currency: currency)) of \(MoneyFormat.string(line.allowed, currency: currency))")
                .font(.subheadline)
            BudgetStatusLabel(status: line.status, left: BudgetText.left(line.available, currency: currency))
        }
    }
}

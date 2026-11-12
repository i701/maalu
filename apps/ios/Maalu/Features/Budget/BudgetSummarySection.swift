import SwiftUI

struct BudgetSummarySection: View {
    let budget: Budget
    let kinds: [BudgetKindTotal]

    private var totals: BudgetTotals { budget.totals }

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                Text("Spent this period")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                MoneyText(totals.activity, currency: budget.currency)
                    .font(.largeTitle)
                    .bold()
                Text("of \(MoneyFormat.string(totals.amount, currency: budget.currency))")
                    .foregroundStyle(.secondary)
                ProgressView(value: min(Double(totals.percent) / 100, 1))
                    .tint(Color(budgetStatus: totals.status))
                    .padding(.top, 4)
                    .accessibilityLabel("All limits")
                    .accessibilityValue("\(totals.percent)%")
                BudgetStatusLabel(status: totals.status, left: "\(totals.percent)% · \(BudgetText.left(totals.available, currency: budget.currency))")
                if budget.attention > 0 {
                    Text("Attention needed on ^[\(budget.attention) limit](inflect: true)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
            ForEach(kinds) { kind in
                AmountRow {
                    Text(kind.title)
                } amount: {
                    Text("\(MoneyFormat.string(kind.spent, currency: budget.currency)) / \(MoneyFormat.string(kind.limit, currency: budget.currency))")
                        .monospacedDigit()
                }
            }
        }
    }
}

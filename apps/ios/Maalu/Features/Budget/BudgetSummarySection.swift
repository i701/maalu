import SwiftUI

/// The whole budget on one card: what was spent of what is allowed, the limits at a glance as rings, and how it splits into needs and wants.
struct BudgetSummarySection: View {
    let budget: Budget
    let kinds: [BudgetKindTotal]

    private static let ringLimit = 8

    private var totals: BudgetTotals { budget.totals }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            AmountRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Spent this period")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Text("of \(MoneyFormat.string(totals.amount, currency: budget.currency))")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            } amount: {
                MoneyText(totals.activity, currency: budget.currency)
                    .font(.largeTitle)
            }
            CapsuleProgress(value: min(Double(totals.percent) / 100, 1))
                .tint(Color(budgetStatus: totals.status))
                .accessibilityLabel("All limits")
                .accessibilityValue("\(totals.percent)%")
            BudgetStatusLabel(status: totals.status, left: "\(totals.percent)% · \(BudgetText.left(totals.available, currency: budget.currency))")
            if budget.attention > 0 {
                Text("Attention needed on ^[\(budget.attention) limit](inflect: true)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if !budget.lines.isEmpty {
                Divider()
                BudgetRingsRow(lines: Array(budget.lines.prefix(Self.ringLimit)), currency: budget.currency)
            }
            if !kinds.isEmpty {
                Divider()
                ForEach(kinds) { kind in
                    AmountRow {
                        Text(kind.title)
                    } amount: {
                        Text("\(MoneyFormat.string(kind.spent, currency: budget.currency)) / \(MoneyFormat.string(kind.limit, currency: budget.currency))")
                            .numericFont()
                    }
                }
            }
        }
        .padding(Spacing.card)
        .frame(maxWidth: .infinity, alignment: .leading)
        .card(elevation: 3)
        .listRowBackground(Color.clear)
        .listRowSeparator(.hidden)
        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 12, trailing: 0))
    }
}

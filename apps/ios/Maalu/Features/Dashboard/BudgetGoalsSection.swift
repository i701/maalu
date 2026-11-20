import SwiftUI

struct BudgetGoalsSection: View {
    let budget: Budget?
    let goals: [Goal]

    private static let lineLimit = 8
    private static let goalLimit = 3

    var body: some View {
        CardSection {
            if let budget, !budget.lines.isEmpty {
                BudgetProgressRow(title: String(localized: "All limits"), spent: budget.totals.activity, limit: budget.totals.amount,
                                  currency: budget.currency, percent: budget.totals.percent, status: budget.totals.status)
                if budget.attention > 0 {
                    Text("Attention needed on ^[\(budget.attention) limit](inflect: true)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                BudgetRingsRow(lines: Array(budget.lines.prefix(Self.lineLimit)), currency: budget.currency)
            }
            if let budget {
                ForEach(budget.runningFixedLines) { line in
                    BudgetProgressRow(title: line.name, spent: line.activity, limit: line.amount,
                                      currency: budget.currency, percent: line.percent, status: line.status)
                }
            }
            ForEach(goals.prefix(Self.goalLimit)) { goal in
                GoalProgressRow(goal: goal)
            }
        } header: {
            SectionTitle("Budget and goals")
        }
    }
}

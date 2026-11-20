import SwiftUI

struct BudgetLinesSection: View {
    let budget: Budget

    var body: some View {
        CardSection {
            if budget.lines.isEmpty {
                Text("No limits yet. A limit is an amount you allow yourself to spend on some categories each month.")
                    .foregroundStyle(.secondary)
            }
            ForEach(budget.lines) { line in
                CardLink(value: BudgetRoute.line(line.id)) {
                    BudgetLineRow(line: line, currency: budget.currency)
                }
            }
        } header: {
            SectionTitle("Limits")
        }
        if !budget.fixedLinesInPeriod.isEmpty {
            CardSection {
                ForEach(budget.fixedLinesInPeriod) { line in
                    CardLink(value: BudgetRoute.fixedLine(line.id)) {
                        FixedBudgetLineRow(line: line, currency: budget.currency)
                    }
                }
            } header: {
                SectionTitle("For set dates")
            }
        }
    }
}

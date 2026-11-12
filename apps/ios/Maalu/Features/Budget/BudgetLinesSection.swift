import SwiftUI

struct BudgetLinesSection: View {
    let budget: Budget

    var body: some View {
        Section("Limits") {
            if budget.lines.isEmpty {
                Text("No limits yet. A limit is an amount you allow yourself to spend on some categories each month.")
                    .foregroundStyle(.secondary)
            }
            ForEach(budget.lines) { line in
                NavigationLink(value: BudgetRoute.line(line.id)) {
                    BudgetLineRow(line: line, currency: budget.currency)
                }
            }
        }
        if !budget.fixedLinesInPeriod.isEmpty {
            Section("For set dates") {
                ForEach(budget.fixedLinesInPeriod) { line in
                    FixedBudgetLineRow(line: line, currency: budget.currency)
                }
            }
        }
    }
}

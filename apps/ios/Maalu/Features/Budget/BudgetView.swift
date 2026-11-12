import SwiftUI

struct BudgetView: View {
    @Environment(Session.self) private var session
    @State private var model = BudgetModel()

    var body: some View {
        NavigationStack {
            List {
                if let budget = model.budget {
                    BudgetSummarySection(budget: budget, kinds: model.kindTotals)
                    BudgetLinesSection(budget: budget)
                }
                GoalsSection(goals: model.goals)
            }
            .overlay { BudgetPlaceholder(model: model, retry: reloadNow) }
            .navigationTitle("Budget")
            .navigationSubtitle(Text(model.month.start, format: .dateTime.month(.wide).year()))
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    MonthSwitcher(canGoForward: true, previous: previousMonth, next: nextMonth)
                }
            }
            .navigationDestination(for: BudgetRoute.self) { route in
                switch route {
                case .line(let line): BudgetLineDetailView(line: line, currency: model.budget?.currency ?? "")
                case .goal(let goal): GoalDetailView(goal: goal)
                }
            }
            .refreshable { await load() }
            .task(id: model.month) { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func previousMonth() {
        model.move(by: -1)
    }

    private func nextMonth() {
        model.move(by: 1)
    }

    private func reloadNow() {
        Task { await load() }
    }
}

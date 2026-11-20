import SwiftUI

struct BudgetView: View {
    @Environment(Session.self) private var session
    @State private var model = BudgetModel()
    @State private var addition: BudgetAddition?
    @State private var isShowingSettings = false

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
            .gradientHeader(.accentAmber)
            .navigationTitle("Budget")
            .navigationSubtitle(model.periodDates.map { Text($0, format: .interval.month(.abbreviated).day()) } ?? Text(model.month.start, format: .dateTime.month(.wide).year()))
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    MonthSwitcher(canGoForward: true, previous: previousMonth, next: nextMonth)
                    Menu("Add", systemImage: "plus") {
                        Button("New Limit", systemImage: "gauge.with.needle") { addition = .limit }
                        Button("New Goal", systemImage: "target") { addition = .goal }
                    }
                    .disabled(model.budget == nil)
                }
                ToolbarItem(placement: .secondaryAction) {
                    Button("Budget Settings", systemImage: "gearshape") { isShowingSettings = true }
                        .disabled(model.budget == nil)
                }
            }
            .sheet(item: $addition) { addition in
                if let budget = model.budget {
                    switch addition {
                    case .limit:
                        BudgetLineFormView(budget: budget, onSaved: reloadNow)
                    case .goal:
                        GoalFormView(currency: budget.currency, onSaved: reloadNow)
                    }
                }
            }
            .sheet(isPresented: $isShowingSettings) {
                if let budget = model.budget {
                    BudgetSettingsView(budget: budget, onSaved: reloadNow)
                }
            }
            .navigationDestination(for: BudgetRoute.self) { route in
                switch route {
                case .line(let id): BudgetLineDetailView(model: model, id: id)
                case .goal(let id): GoalDetailView(model: model, id: id)
                case .fixedLine(let id): FixedBudgetLineDetailView(model: model, id: id)
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

import SwiftUI

struct DashboardView: View {
    @Environment(Session.self) private var session
    @State private var model = DashboardModel()
    @State private var isArranging = false

    var body: some View {
        NavigationStack {
            CardPage {
                ForEach(model.orderedSections) { section in
                    DashboardSectionContent(section: section, model: model)
                }
            }
            .gradientHeader(.accentLime)
            .overlay { DashboardPlaceholder(model: model, retry: reloadNow) }
            .navigationTitle("Dashboard")
            .navigationSubtitle(Text(model.month.start, format: .dateTime.month(.wide).year()))
            .toolbar {
                ToolbarItemGroup(placement: .primaryAction) {
                    MonthSwitcher(canGoForward: !model.isCurrentMonth, previous: previousMonth, next: nextMonth)
                        .accentTint(.accentLime)
                    Menu("More", systemImage: "ellipsis.circle") {
                        Button("Arrange the dashboard", systemImage: "arrow.up.arrow.down") { isArranging = true }
                    }
                    .accentTint(.accentLime)
                }
            }
            .navigationDestination(for: DashboardRoute.self) { route in
                switch route {
                case .working:
                    if let available = model.available { AvailableWorkingView(available: available) }
                case .plan:
                    PlanView()
                case .netWorth:
                    NetWorthView()
                case .cashFlowTable(let count):
                    CashFlowTableView(months: KeptMonth.months(from: model.months.suffix(count)), currency: model.currency)
                }
            }
            .sheet(isPresented: $isArranging) {
                DashboardArrangeView(sections: model.orderedSections, defaults: model.shownSections, onSave: saveOrder)
            }
            .refreshable { await load() }
            .task(id: model.month) { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func saveOrder(_ order: [DashboardSection]?) async -> String? {
        guard let api = session.api else { return nil }
        return await model.saveOrder(order, using: api)
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

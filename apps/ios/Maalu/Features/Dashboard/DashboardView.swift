import SwiftUI

struct DashboardView: View {
    @Environment(Session.self) private var session
    @State private var model = DashboardModel()

    var body: some View {
        NavigationStack {
            List {
                if let available = model.available {
                    AvailableToSpendSection(available: available)
                }
                if let summary = model.summary {
                    NetWorthSection(summary: summary, trend: model.trend)
                }
                if !model.months.isEmpty {
                    CashFlowSection(months: model.months, currency: model.currency)
                }
            }
            .overlay { DashboardPlaceholder(model: model, retry: reloadNow) }
            .navigationTitle("Dashboard")
            .navigationDestination(for: DashboardRoute.self) { _ in
                if let available = model.available {
                    AvailableWorkingView(available: available)
                }
            }
            .refreshable { await load() }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func reloadNow() {
        Task { await load() }
    }
}

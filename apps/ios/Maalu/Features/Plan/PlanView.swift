import SwiftUI

struct PlanView: View {
    @Environment(Session.self) private var session
    @State private var model = PlanModel()
    @State private var paying: PlanRow?

    var body: some View {
        List {
            if let available = model.available, let plan = model.plan {
                PlanSummarySection(available: available, overdueCount: model.overdueCount, firstShort: plan.firstShort)
                if plan.days.isEmpty {
                    Section { Text("Nothing is planned for the rest of the period.").foregroundStyle(.secondary) }
                }
                ForEach(plan.days) { day in
                    PlanDaySection(day: day, today: available.today, currency: available.currency) { paying = $0 }
                }
                PlanSidebarSections(available: available)
            }
        }
        .overlay { PlanPlaceholder(model: model, retry: reloadNow) }
        .navigationTitle("Month plan")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $paying) { row in
            MarkPaidView(transactionID: row.id, onDone: reloadNow)
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func reloadNow() {
        Task { await load() }
    }
}

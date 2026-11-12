import SwiftUI

struct PlanDaySection: View {
    let day: PlanDay
    let today: String
    let currency: String
    let onMarkPaid: (PlanRow) -> Void

    var body: some View {
        Section {
            ForEach(day.rows) { row in
                if row.canMarkPaid {
                    Button { onMarkPaid(row) } label: {
                        PlanRowView(row: row, currency: currency)
                    }
                    .foregroundStyle(.primary)
                    .accessibilityHint(row.kind == .income ? "Marks it as received" : "Marks it as paid")
                } else {
                    PlanRowView(row: row, currency: currency)
                }
            }
        } header: {
            Text(day.title(today: today))
                .foregroundStyle(day.isOverdue ? Color.red : Color.secondary)
        }
    }
}

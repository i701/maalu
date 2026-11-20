import SwiftUI

/// The number the dashboard is for: what can be spent until the end of the period, large and in colour, with the sum behind it.
struct AvailableToSpendSection: View {
    let available: AvailableToSpend

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 6) {
                Text(available.isShort ? "Short by" : "Available to spend")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                MoneyText(available.magnitude, currency: available.currency)
                    .font(.largeTitle)
                    .foregroundStyle(available.isShort ? Color.red : Color.brand)
                if let end = ISODate.date(available.periodEnd) {
                    Text("until \(end, format: .dateTime.day().month(.wide))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text(available.summary)
                    .font(.footnote)
                    .foregroundStyle(.secondary)
                    .padding(.top, 6)
            }
            .padding(.vertical, 6)
            NavigationLink(value: DashboardRoute.working) {
                Label("Show the working", systemImage: "list.bullet.rectangle")
                    .font(.subheadline)
            }
            NavigationLink(value: DashboardRoute.plan) {
                Label("Open the month plan", systemImage: "calendar")
                    .font(.subheadline)
            }
        }
    }
}

import SwiftUI

struct AvailableToSpendSection: View {
    let available: AvailableToSpend

    var body: some View {
        Section {
            VStack(alignment: .leading, spacing: 4) {
                Text(available.isShort ? "Short by" : "Available to spend")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                MoneyText(available.magnitude, currency: available.currency)
                    .font(.largeTitle)
                    .bold()
                    .foregroundStyle(available.isShort ? Color.red : Color.primary)
                if let end = ISODate.date(available.periodEnd) {
                    Text("until \(end, format: .dateTime.day().month(.wide))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Text(available.summary)
                    .font(.subheadline)
                    .padding(.top, 4)
            }
            NavigationLink("Show the working", value: DashboardRoute.working)
        }
    }
}

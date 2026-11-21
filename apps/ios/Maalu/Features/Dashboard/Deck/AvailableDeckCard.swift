import SwiftUI

/// The first deck card: what can be spent until the end of the period, and the two places to go from it.
struct AvailableDeckCard: View {
    let available: AvailableToSpend

    var body: some View {
        DeckCardFrame(color: available.isShort ? .red : .brand) {
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text(available.isShort ? "Short by" : "Available to spend")
                        .font(.subheadline.weight(.medium))
                        .opacity(0.8)
                    Spacer()
                    if let end = ISODate.date(available.periodEnd) {
                        DeckPill(title: String(localized: "until \(end.formatted(.dateTime.day().month(.abbreviated)))"))
                    }
                }
                MoneyText(available.magnitude, currency: available.currency)
                    .font(.largeTitle)
                    .fontWeight(.semibold)
                    .allowsHitTesting(false)
                Spacer(minLength: 6)
                HStack(spacing: 8) {
                    NavigationLink(value: DashboardRoute.working) { DeckPill(title: String(localized: "Show the working"), systemImage: "list.bullet.rectangle") }
                    NavigationLink(value: DashboardRoute.plan) { DeckPill(title: String(localized: "Month plan"), systemImage: "calendar") }
                }
                .buttonStyle(.plain)
            }
        }
    }
}

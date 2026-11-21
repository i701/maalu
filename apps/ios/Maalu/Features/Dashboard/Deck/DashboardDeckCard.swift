import SwiftUI

/// The deck card for one of the deck's sections.
struct DashboardDeckCard: View {
    let section: DashboardSection
    let model: DashboardModel

    var body: some View {
        switch section {
        case .available:
            if let available = model.available { AvailableDeckCard(available: available) }
        case .metrics:
            if let totals = model.totals { KeptDeckCard(totals: totals, previous: model.previousTotals, months: model.months) }
        default:
            EmptyView()
        }
    }
}

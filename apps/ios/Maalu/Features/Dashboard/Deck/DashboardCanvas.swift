import SwiftUI

/// The Dashboard's summary cards as a flat canvas: no cards, stack or shadows, only each summary's text on the page, one under the other and parted by hairlines.
struct DashboardCanvas: View {
    let sections: [DashboardSection]
    let model: DashboardModel

    var body: some View {
        VStack(spacing: 0) {
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                if index > 0 { Divider().padding(.vertical, 18) }
                DashboardDeckCard(section: section, model: model)
            }
        }
        .environment(\.deckIsFlat, true)
        .padding(.horizontal, 6)
        .padding(.vertical, 8)
    }
}

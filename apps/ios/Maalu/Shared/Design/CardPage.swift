import SwiftUI

/// A page that is a stack of cards on the grey page, with the soft level unless given one: the Dashboard and Accounts take it, a detail screen is flat (level 0).
struct CardPage<Content: View>: View {
    var elevation = Elevation.soft
    @ViewBuilder let content: Content

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 24) {
                content
            }
            .padding(.horizontal, Spacing.screen)
            .padding(.vertical, 8)
        }
        .environment(\.cardElevation, elevation)
    }
}

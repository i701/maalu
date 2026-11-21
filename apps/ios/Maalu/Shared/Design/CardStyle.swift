import SwiftUI

extension EnvironmentValues {
    /// The elevation a card takes when it names none, so a screen sets it once for all its cards.
    @Entry var cardElevation: Double = 2
}

private struct CardStyle: ViewModifier {
    @Environment(\.cardElevation) private var screenElevation
    let radius: CGFloat
    let elevation: Double?

    func body(content: Content) -> some View {
        content
            .background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: radius, style: .continuous))
            .elevation(elevation ?? screenElevation, cornerRadius: radius)
    }
}

extension View {
    /// A card: its own fill, a big soft corner and a layered shadow (see `Elevation`), at the screen's level unless given one. Level 0 is only a hairline ring.
    func card(radius: CGFloat = Radius.card, elevation: Double? = nil) -> some View {
        modifier(CardStyle(radius: radius, elevation: elevation))
    }
}

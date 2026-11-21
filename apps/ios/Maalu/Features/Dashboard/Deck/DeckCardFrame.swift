import SwiftUI

/// The body of a deck card: a soft gradient of the card's hue with a topographic line pattern fading up across it, and text in the same hue, deepened. Every card of a deck takes the height of the tallest.
/// The pattern is a topography SVG (a tileable vector line map) tinted with the ink and faded toward one corner.
struct DeckCardFrame<Content: View>: View {
    /// The card's own hue.
    let color: Color
    @ViewBuilder let content: Content
    @Environment(\.colorScheme) private var scheme
    @Environment(\.deckDepth) private var depth

    private var shape: RoundedRectangle { RoundedRectangle(cornerRadius: Radius.card, style: .continuous) }

    private var ink: Color { scheme == .dark ? color.mix(with: .white, by: 0.55) : color.mix(with: .black, by: 0.4) }

    private var gradient: LinearGradient {
        let colors = scheme == .dark
            ? [color.mix(with: .black, by: 0.62), color.mix(with: .black, by: 0.82)]
            : [color.mix(with: .white, by: 0.8), color.mix(with: .white, by: 0.55)]
        return LinearGradient(colors: colors, startPoint: .topLeading, endPoint: .bottomTrailing)
    }

    var body: some View {
        content
            .foregroundStyle(ink)
            .environment(\.deckInk, ink)
            .padding(Spacing.card)
            .frame(maxWidth: .infinity, minHeight: 168, maxHeight: .infinity, alignment: .topLeading)
            .background {
                // an overlay, so the pattern's own size can never change the card's
                shape.fill(gradient)
                    .overlay { pattern }
                    .clipShape(shape)
            }
            .elevation(2, cornerRadius: Radius.card, isOn: depth == 0)
    }

    /// The lines, strongest along the bottom edge and gone toward the top, so they are present without getting under the title and the figure. The fade is sized to the card, not to the image.
    private var pattern: some View {
        Image("TopographyPattern")
            .resizable()
            .scaledToFill()
            .frame(width: 420, height: 420)
            .foregroundStyle(ink.opacity(scheme == .dark ? 0.2 : 0.16))
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .mask(
                LinearGradient(
                    stops: [.init(color: .black, location: 0), .init(color: .black, location: 0.12), .init(color: .clear, location: 0.55)],
                    startPoint: .bottom,
                    endPoint: .top
                )
            )
            .allowsHitTesting(false)
            .accessibilityHidden(true)
    }
}

import SwiftUI

extension View {
    /// The app's header backdrop: a grainy sky blue in light mode and midnight blue in dark mode (the logo's colours), at the top of the page and fading downward into the page's own colour, so a white card on it has something to stand against.
    /// `accent` is kept so callers still say which screen they are, but it no longer tints the backdrop; it colours buttons and forms through `accentTint`. `height` is how tall the wash is (shorter fades to the page sooner, as on the transaction form, where the type bar sits on the pale end). `base` is the page's own colour; it fills the whole page, so the fade ends in exactly what is below it.
    /// Put it on a list or scroll view, which must not draw its own background.
    func gradientHeader(_ accent: Color = .brand, base: Color = Color(.systemGroupedBackground), height: CGFloat = 560) -> some View {
        scrollContentBackground(.hidden)
            .background(alignment: .top) {
                HeaderWashImage(height: height)
                    .mask(LinearGradient(stops: [.init(color: .black, location: 0), .init(color: .black.opacity(0.55), location: 0.4), .init(color: .clear, location: 1)], startPoint: .top, endPoint: .bottom))
                    .ignoresSafeArea()
                    .accessibilityHidden(true)
            }
            .background { base.ignoresSafeArea() }
    }
}

/// The wash is mirrored in light mode so its dark side sits on the right, away from the titles and figures; dark mode keeps it as drawn.
private struct HeaderWashImage: View {
    let height: CGFloat
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Image("HeaderWash")
            .resizable()
            .scaledToFill()
            .frame(height: height, alignment: .top)
            .frame(maxWidth: .infinity)
            .clipped()
            .scaleEffect(x: colorScheme == .light ? -1 : 1)
    }
}

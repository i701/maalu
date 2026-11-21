import SwiftUI

/// A small pill, frosted (it blurs the pattern behind it; whitened in light mode so it does not go grey) and lightly tinted, on a deck card: a link's label, or a fact like "until December 4". It takes the card's ink.
struct DeckPill: View {
    let title: String
    var systemImage: String?
    @Environment(\.deckInk) private var ink
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Group {
            if let systemImage {
                Label(title, systemImage: systemImage)
            } else {
                Text(title)
            }
        }
        .font(.footnote.weight(.semibold))
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        // light mode lifts the material toward white, which would otherwise read grey on a pale card; dark mode keeps it as it is
        .background(scheme == .dark ? Color.clear : Color.white.opacity(0.5), in: .capsule)
        .background(.ultraThinMaterial, in: .capsule)
        .background(ink.opacity(scheme == .dark ? 0.08 : 0.04), in: .capsule)
    }
}

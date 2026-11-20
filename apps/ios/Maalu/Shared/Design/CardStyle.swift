import SwiftUI

extension View {
    /// A card: its own fill, a big soft corner and a layered shadow (see `Elevation`). Level 0 is only a hairline ring.
    func card(radius: CGFloat = Radius.card, elevation level: Int = 2) -> some View {
        background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: radius, style: .continuous))
            .elevation(level, cornerRadius: radius)
    }
}

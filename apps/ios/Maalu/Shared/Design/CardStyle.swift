import SwiftUI

extension View {
    /// A white card on the grey page: a big soft corner and, on a plain page, a faint neutral shadow. In a list row pass `hasShadow: false`,
    /// which clips a shadow to a hard grey strip.
    func card(radius: CGFloat = Radius.card, hasShadow: Bool = true) -> some View {
        background(Color(.secondarySystemGroupedBackground), in: .rect(cornerRadius: radius, style: .continuous))
            .shadow(color: .black.opacity(hasShadow ? 0.06 : 0), radius: 12, y: 3)
    }
}

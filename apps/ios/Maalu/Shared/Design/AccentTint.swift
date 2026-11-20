import SwiftUI

/// Tints a control, a toolbar button or a whole form in its screen's accent, so they follow the wash behind them instead of all being the brand's blue.
/// The brand's own blue is left as it is. Other accents are darkened in light mode, where a pale yellow or green would barely show as text on white, and lightened a little in dark mode.
struct AccentTint: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    let accent: Color

    func body(content: Content) -> some View {
        content.tint(accent == .brand ? accent : scheme == .dark ? accent.mix(with: .white, by: 0.15) : accent.mix(with: .black, by: 0.3))
    }
}

extension View {
    func accentTint(_ accent: Color) -> some View {
        modifier(AccentTint(accent: accent))
    }
}

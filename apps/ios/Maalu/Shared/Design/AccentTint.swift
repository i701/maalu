import SwiftUI

/// Tints a control, a toolbar button or a whole form in the theme's blue, whatever screen it is on, to match the sky and midnight backdrop and the logo.
/// The `accent` a screen names is kept (a screen can go back to its own colour by returning it here) but is not used. shortcut: ignores the accent; restore the old mix to bring per-screen colours back.
struct AccentTint: ViewModifier {
    let accent: Color

    func body(content: Content) -> some View {
        content.tint(.brand)
    }
}

extension View {
    func accentTint(_ accent: Color) -> some View {
        modifier(AccentTint(accent: accent))
    }
}

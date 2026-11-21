import SwiftUI

/// The colours of a pale chip in one tint. Light mode darkens the tint for the text on a faint fill; on a dark card that same darkened tint is hard to read, so dark mode lightens the text and
/// strengthens the fill. A chip that is on is solid: the tint with white text in light mode, a lighter tint with black text in dark mode.
struct ChipColors {
    let tint: Color
    let scheme: ColorScheme

    var ink: Color { scheme == .dark ? tint.mix(with: .white, by: 0.45) : tint.mix(with: .black, by: 0.2) }
    var fill: Color { tint.opacity(scheme == .dark ? 0.24 : 0.14) }
    var solidFill: Color { scheme == .dark ? tint.mix(with: .white, by: 0.25) : tint }
    var solidInk: Color { scheme == .dark ? .black : Color(.systemBackground) }
}

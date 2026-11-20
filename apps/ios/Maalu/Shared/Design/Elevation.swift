import SwiftUI

/// A layered shadow: a hairline ring, then one soft shadow per level, each twice as far down and as blurred as the one before, and pulled in
/// by half its offset (the CSS "negative spread"), so the shadow gathers under the card instead of spilling round it. Level 0 is the ring
/// alone, 3 a card, 5 a popover. Draw it behind a card that already has its own fill.
struct Elevation: ViewModifier {
    @Environment(\.colorScheme) private var scheme
    let level: Int
    let cornerRadius: CGFloat

    private static let offsets: [CGFloat] = [1, 3, 6, 12, 24, 48]

    func body(content: Content) -> some View {
        content
            .overlay { if scheme == .dark { insetLight } }
            .background {
            ZStack {
                RoundedRectangle(cornerRadius: cornerRadius + 1, style: .continuous)
                    .fill(ring)
                    .padding(-1)
                ForEach(Self.offsets.prefix(min(max(level, 0), Self.offsets.count)), id: \.self) { offset in
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .inset(by: offset / 2)
                        .fill(Color.white)
                        .shadow(color: drop, radius: offset / 2, y: offset)
                }
            }
        }
    }

    /// Dark mode paints light instead of shadow (the CSS "inset" layers): a 1px ring all round and a brighter edge at the top, both stronger
    /// the higher the card sits. Black drops cannot show on a near-black page, this is what lifts the card.
    private var insetLight: some View {
        let i = min(max(level, 0), Self.highlight.count - 1)
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
        return ZStack {
            shape.strokeBorder(.white.opacity(Self.insetRing[i]), lineWidth: 1)
            shape.strokeBorder(
                LinearGradient(colors: [.white.opacity(Self.highlight[i]), .clear], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.12)),
                lineWidth: 1.5
            )
        }
        .allowsHitTesting(false)
    }

    // the dark elevation tokens of the CodePen, per level (0 to 6)
    private static let highlight: [Double] = [0, 0.04, 0.08, 0.14, 0.18, 0.22, 0.26]
    private static let insetRing: [Double] = [0.02, 0.04, 0.05, 0.06, 0.08, 0.10, 0.12]

    // lighter in light mode, where a faint edge and shadow are enough; dark mode keeps its own values
    private var ring: Color { scheme == .dark ? .white.opacity(0.06) : .black.opacity(0.035) }
    private var drop: Color { scheme == .dark ? .black.opacity(0.18) : .black.opacity(0.04) }
}

extension View {
    func elevation(_ level: Int, cornerRadius: CGFloat = Radius.card) -> some View {
        modifier(Elevation(level: level, cornerRadius: cornerRadius))
    }
}

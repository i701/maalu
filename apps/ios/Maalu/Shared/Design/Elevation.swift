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
        content.background {
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

    private var ring: Color { scheme == .dark ? .white.opacity(0.06) : .black.opacity(0.06) }
    private var drop: Color { scheme == .dark ? .black.opacity(0.18) : .black.opacity(0.06) }
}

extension View {
    func elevation(_ level: Int, cornerRadius: CGFloat = Radius.card) -> some View {
        modifier(Elevation(level: level, cornerRadius: cornerRadius))
    }
}

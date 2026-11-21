import SwiftUI

/// Where a card sits in the deck: the front one follows the finger up or down and, the further it is pulled, softens (blurs, fades, shrinks a little); each one behind is a step smaller, higher and blurred, and comes into focus as the front one is pulled away.
struct DeckPosition: ViewModifier {
    let depth: Int
    let drag: CGFloat
    /// 0 at rest, 1 once the front card has been pulled well clear.
    let progress: CGFloat

    private static let rise: CGFloat = 14
    private static let shrink: CGFloat = 0.06
    private static let blur: CGFloat = 2.5

    func body(content: Content) -> some View {
        let steps = depth == 0 ? 0 : max(CGFloat(depth) - progress, 0)
        let pulled = min(abs(drag) / 160, 1)
        content
            .scaleEffect(1 - steps * Self.shrink - pulled * 0.05, anchor: .top)
            .offset(y: depth == 0 ? Self.resisted(drag) : -steps * Self.rise)
            .blur(radius: depth == 0 ? pulled * 9 : steps * Self.blur)
            .opacity(depth == 0 ? 1 - Double(pulled) * 0.55 : 1)
    }

    /// The front card follows the finger with growing resistance, as if it had weight: nearly one to one at first, and the harder it is pulled the less it gives, up to a limit.
    private static func resisted(_ drag: CGFloat) -> CGFloat {
        let limit: CGFloat = 110
        return (drag < 0 ? -1 : 1) * limit * (1 - exp(-abs(drag) / limit))
    }
}

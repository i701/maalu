import SwiftUI

/// The Dashboard's summary cards as a stack: the front card is whole and the next ones rise behind it, one step smaller. Swipe the front card up and it softens and settles at the back, swipe down and the last card comes forward, all inside the deck; VoiceOver's swipe up and down changes card too. There are no page dots: they read as a sideways carousel.
/// The look is the stacked cards of a reference design (a task deck), redrawn here.
struct DashboardDeck: View {
    let sections: [DashboardSection]
    let model: DashboardModel
    /// True while a finger is on the deck, so the page does not scroll under a swipe on it.
    @Binding var isHeld: Bool
    @State private var front = 0
    @State private var drag: CGFloat = 0

    private static let steps = 3
    private static let rise: CGFloat = 14
    /// A card that has been let go of settles on a soft spring with a little overshoot, so it feels like it has mass; one let go of too soon snaps back with more bounce.
    private static let settle = Animation.spring(response: 0.55, dampingFraction: 0.74)
    private static let snapBack = Animation.spring(response: 0.45, dampingFraction: 0.62)
    /// The margin around the stack in which a card fades out.
    private static let fade: CGFloat = 70

    var body: some View {
        let count = sections.count
        let current = min(front, max(count - 1, 0))
        ZStack {
            ForEach(Array(sections.enumerated()), id: \.element.id) { index, section in
                let depth = (index - current + count) % count
                if depth < Self.steps {
                    DashboardDeckCard(section: section, model: model)
                        .environment(\.deckDepth, depth)
                        .modifier(DeckPosition(depth: depth, drag: depth == 0 ? drag : 0, progress: min(abs(drag) / 140, 1)))
                        .zIndex(Double(Self.steps - depth))
                        .allowsHitTesting(depth == 0)
                        .accessibilityHidden(depth != 0)
                }
            }
        }
        .padding(.top, Self.rise * CGFloat(min(count, Self.steps) - 1))
        .padding(.vertical, Self.fade)
        .mask {
            // solid over the stack, fading out across the margin around it: a card pulled past the edge dissolves instead of being cut off
            VStack(spacing: 0) {
                LinearGradient(colors: [.clear, .black], startPoint: .top, endPoint: .bottom).frame(height: Self.fade)
                Rectangle()
                LinearGradient(colors: [.black, .clear], startPoint: .top, endPoint: .bottom).frame(height: Self.fade)
            }
        }
        .padding(.vertical, -Self.fade)
        .simultaneousGesture(DragGesture(minimumDistance: 0).onChanged { _ in isHeld = true }.onEnded { _ in isHeld = false })
        .simultaneousGesture(count > 1 ? swipe(count: count) : nil)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Card \(current + 1) of \(count)")
        .accessibilityAdjustableAction { direction in
            switch direction {
            case .increment: flip(by: 1, count: count)
            case .decrement: flip(by: -1, count: count)
            @unknown default: break
            }
        }
    }

    private func swipe(count: Int) -> some Gesture {
        DragGesture(minimumDistance: 14)
            .onChanged { value in
                // up and down only: a mostly sideways drag is left to the page
                if abs(value.translation.height) > abs(value.translation.width) { drag = value.translation.height }
            }
            .onEnded { value in
                let flung = abs(value.translation.height) > 90 || abs(value.predictedEndTranslation.height) > 220
                guard flung, abs(value.translation.height) > abs(value.translation.width) else { return settle() }
                flip(by: value.translation.height < 0 ? 1 : -1, count: count)
            }
    }

    /// Brings the next card (up) or the previous one (down) to the front with the same spring for both directions: every card moves to its new place from where it is now, so nothing jumps or comes in from outside the deck.
    private func flip(by step: Int, count: Int) {
        withAnimation(Self.settle) {
            front = (min(front, count - 1) + step + count) % count
            drag = 0
        }
    }

    private func settle() {
        withAnimation(Self.snapBack) { drag = 0 }
    }
}

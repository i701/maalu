import SwiftUI

private struct RevealOnAppear: ViewModifier {
    @Binding var isShown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func body(content: Content) -> some View {
        content.onAppear {
            if reduceMotion {
                isShown = true
            } else {
                withAnimation(.smooth(duration: 0.9)) { isShown = true }
            }
        }
    }
}

extension View {
    /// Sets `isShown` when the view first appears, animated unless Reduce Motion is on, so a chart or bar can draw itself in from nothing.
    func revealOnAppear(_ isShown: Binding<Bool>) -> some View {
        modifier(RevealOnAppear(isShown: isShown))
    }
}

import SwiftUI

extension EnvironmentValues {
    /// The screen whose first view of itself may draw its charts in; nil for a screen that never does.
    @Entry var revealScreen: String?
}

/// Charts draw themselves in only while a screen is first shown after the app opens: the first chart of a screen opens a short window for it, and anything that appears later (scrolling, coming back to the screen) is simply there.
@MainActor
private enum RevealWindow {
    private static let length: TimeInterval = 1.5
    private static var opened: [String: Date] = [:]

    static func isOpen(_ screen: String?) -> Bool {
        guard let screen else { return false }
        guard let start = opened[screen] else {
            opened[screen] = .now
            return true
        }
        return Date.now.timeIntervalSince(start) < length
    }
}

private struct RevealOnAppear: ViewModifier {
    @Binding var isShown: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.revealScreen) private var screen

    func body(content: Content) -> some View {
        content.onAppear {
            if RevealWindow.isOpen(screen) && !reduceMotion {
                withAnimation(.smooth(duration: 0.9)) { isShown = true }
            } else {
                withAnimation(nil) { isShown = true }
            }
        }
    }
}

extension View {
    /// Sets `isShown` when the view appears, animated only for a screen's first showing (see `RevealWindow`) and never with Reduce Motion, so a chart or bar can draw itself in from nothing.
    func revealOnAppear(_ isShown: Binding<Bool>) -> some View {
        modifier(RevealOnAppear(isShown: isShown))
    }
}

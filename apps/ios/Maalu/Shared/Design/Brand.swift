import SwiftUI

extension Color {
    /// The app's one accent, a vivid blue, for primary actions and key highlights. Never for large backgrounds or body text.
    static let brand = Color(red: 0x43 / 255, green: 0x7C / 255, blue: 0xEF / 255)
    /// Money coming in and good news.
    static let success = Color(red: 0x00, green: 0x8A / 255, blue: 0x33 / 255)
}

/// The corner radii of the design: a big card, a tile or chip.
enum Radius {
    static let card: CGFloat = 26
    static let tile: CGFloat = 16
}

/// Horizontal spacing: the page's edge, and how far a card's content sits inside the card. Text on the page lines up with a card's content.
enum Spacing {
    static let screen: CGFloat = 16
    static let card: CGFloat = 18
}

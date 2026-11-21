import SwiftUI

extension EnvironmentValues {
    /// The colour of the text and drawing on the deck card around it, which is the card's own hue deepened (light mode) or lightened (dark mode).
    @Entry var deckInk: Color = .primary
}

extension EnvironmentValues {
    /// True when the deck's cards are drawn flat: no card, shadow or pattern, only their text on the page.
    @Entry var deckIsFlat: Bool = false
}

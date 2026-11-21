import SwiftUI

/// Income against spending as two bars, in the ink of the deck card around it.
struct DeckIncomeBar: View {
    let income: Decimal
    let spent: Decimal
    @Environment(\.deckInk) private var ink

    var body: some View {
        IncomeSpendBar(income: income, spent: spent, color: ink)
    }
}

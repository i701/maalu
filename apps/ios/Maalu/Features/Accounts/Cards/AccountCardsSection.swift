import SwiftUI

/// An account's cards: tap one to change it, swipe to delete it, and a credit card's Repay starts its repayment.
struct AccountCardsSection: View {
    let cards: [Card]
    let kind: CardKind
    let onAdd: () -> Void
    let onEdit: (Card) -> Void
    let onDelete: (Card) -> Void
    let onRepay: (Card) -> Void

    var body: some View {
        Section {
            ForEach(cards) { card in
                Button { onEdit(card) } label: {
                    CardRow(card: card)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .swipeActions {
                    Button("Delete", systemImage: "trash", role: .destructive) { onDelete(card) }
                }
                if card.kind == .credit, card.repayAccount != nil {
                    Button("Repay \(card.name)", systemImage: "arrow.uturn.backward.circle") { onRepay(card) }
                }
            }
            if kind == .debit || cards.isEmpty {
                Button(kind == .credit ? "Add Credit Card" : "Add Debit Card", systemImage: "plus", action: onAdd)
            }
        } header: {
            Text("Cards")
        } footer: {
            Text(kind == .credit
                ? "The card behind this account. Set where it is repaid from to get a Repay button."
                : "Debit cards spend from this account. Pick one on a purchase to record which card paid.")
        }
    }
}

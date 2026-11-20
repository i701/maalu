import SwiftUI

/// The quick filters under the search field: one type, and planned. Each has its own colour; tap the one that is on to turn it off. They share
/// the card's width, and scroll sideways only when a large text size leaves them no room.
struct TransactionTypeChips: View {
    @Binding var type: TransactionType?
    @Binding var planned: Bool

    var body: some View {
        ViewThatFits(in: .horizontal) {
            TransactionTypeChipRow(type: $type, planned: $planned)
                .padding(.horizontal, Spacing.card)
            ScrollView(.horizontal) {
                TransactionTypeChipRow(type: $type, planned: $planned)
                    .padding(.horizontal, Spacing.card)
            }
            .scrollIndicators(.hidden)
        }
    }
}

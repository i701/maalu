import SwiftUI

/// The divider and the three totals, which the search card reveals once the list is narrowed.
struct TransactionTotalsPanel: View {
    let totals: TransactionTotals

    var body: some View {
        VStack(spacing: 0) {
            Divider().padding(.horizontal, Spacing.card)
            TransactionTotalsRow(totals: totals)
                .padding(.horizontal, Spacing.card)
                .padding(.vertical, 14)
        }
    }
}

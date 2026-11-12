import SwiftUI

/// A label on the left that may wrap, and an amount that always stays on the right.
/// `LabeledContent` moves the value under a long label, which makes a list ragged.
struct AmountRow<Label: View, Amount: View>: View {
    @ViewBuilder let label: Label
    @ViewBuilder let amount: Amount

    var body: some View {
        HStack(alignment: .firstTextBaseline) {
            label.frame(maxWidth: .infinity, alignment: .leading)
            amount.fixedSize()
        }
    }
}

import SwiftUI

/// A row of a card that opens another screen: its label and a chevron, as a `List` row would draw it.
struct CardLink<Label: View, Value: Hashable>: View {
    let value: Value
    @ViewBuilder let label: Label

    var body: some View {
        NavigationLink(value: value) {
            HStack {
                label
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.footnote.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .contentShape(.rect)
        }
        .buttonStyle(.plain)
    }
}

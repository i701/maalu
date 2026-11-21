import SwiftUI

/// One quick filter: a pale tint with darker text, solid when it is on.
struct TransactionTypeChip: View {
    let title: String
    let tint: Color
    let isOn: Bool
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let colors = ChipColors(tint: tint, scheme: scheme)
        Button(action: action) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .lineLimit(1)
                .foregroundStyle(isOn ? colors.solidInk : colors.ink)
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .frame(maxWidth: .infinity)
                .background(isOn ? colors.solidFill : colors.fill, in: .capsule)
        }
        .buttonStyle(.borderless)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

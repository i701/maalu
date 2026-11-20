import SwiftUI

/// One quick filter: a pale tint with darker text, solid when it is on.
struct TransactionTypeChip: View {
    let title: String
    let tint: Color
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.footnote.weight(.semibold))
                .lineLimit(1)
                .foregroundStyle(isOn ? Color(.systemBackground) : tint.mix(with: .black, by: 0.2))
                .padding(.horizontal, 12)
                .padding(.vertical, 7)
                .frame(maxWidth: .infinity)
                .background(isOn ? tint : tint.opacity(0.14), in: .capsule)
        }
        .buttonStyle(.borderless)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

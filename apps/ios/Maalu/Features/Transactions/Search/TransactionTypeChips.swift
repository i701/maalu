import SwiftUI

/// The quick filters under the search field: all, one type, and planned. Each has its own colour, solid when it is on; tap the one that is on to turn it off.
struct TransactionTypeChips: View {
    @Binding var type: TransactionType?
    @Binding var planned: Bool

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                chip(String(localized: "All"), tint: .primary, isOn: type == nil) { type = nil }
                ForEach(TransactionType.allCases) { option in
                    chip(String(localized: option.title), tint: tint(of: option), isOn: type == option) { type = type == option ? nil : option }
                }
                chip(String(localized: "Planned"), tint: .orange, isOn: planned) { planned.toggle() }
            }
            .padding(.horizontal, Spacing.card)
        }
        .scrollIndicators(.hidden)
    }

    private func tint(of type: TransactionType) -> Color {
        switch type {
        case .income: .success
        case .expense: .red
        case .transfer: .brand
        }
    }

    private func chip(_ title: String, tint: Color, isOn: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(isOn ? Color(.systemBackground) : tint.mix(with: .black, by: 0.2))
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isOn ? tint : tint.opacity(0.14), in: .capsule)
        }
        .buttonStyle(.borderless)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

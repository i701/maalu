import SwiftUI

struct TransactionTypeChipRow: View {
    @Binding var type: TransactionType?
    @Binding var planned: Bool

    var body: some View {
        HStack(spacing: 6) {
            ForEach(TransactionType.allCases) { option in
                TransactionTypeChip(title: String(localized: option.title), tint: option.tint, isOn: type == option) {
                    type = type == option ? nil : option
                }
            }
            TransactionTypeChip(title: String(localized: "Planned"), tint: .orange, isOn: planned) { planned.toggle() }
        }
    }
}

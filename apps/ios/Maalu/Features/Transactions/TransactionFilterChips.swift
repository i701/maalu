import SwiftUI

/// The active filters as chips you can drop one at a time.
struct TransactionFilterChips: View {
    let chips: [TransactionFilterChip]
    let onRemove: (TransactionFilterChip) -> Void

    var body: some View {
        ScrollView(.horizontal) {
            HStack {
                ForEach(chips) { chip in
                    Button { onRemove(chip) } label: {
                        Label(chip.title, systemImage: "xmark")
                            .labelStyle(.titleAndIcon)
                            .lineLimit(1)
                    }
                    .accessibilityHint("Removes this filter")
                }
            }
            .padding(.horizontal)
        }
        .scrollIndicators(.hidden)
        .buttonStyle(.bordered)
        .buttonBorderShape(.capsule)
        .controlSize(.small)
    }
}

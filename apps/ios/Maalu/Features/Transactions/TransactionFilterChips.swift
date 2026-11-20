import SwiftUI

/// The active filters as chips you can drop one at a time.
struct TransactionFilterChips: View {
    let chips: [TransactionFilterChip]
    let onRemove: (TransactionFilterChip) -> Void

    var body: some View {
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(chips) { chip in
                    Button { onRemove(chip) } label: {
                        HStack(spacing: 6) {
                            Text(chip.title).lineLimit(1)
                            Image(systemName: "xmark").font(.caption2.weight(.bold))
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(Color.brand)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(Color.brand.opacity(0.12), in: .capsule)
                    }
                    .accessibilityHint("Removes this filter")
                }
            }
            .padding(.horizontal, Spacing.card)
        }
        .scrollIndicators(.hidden)
        .buttonStyle(.borderless)
    }
}

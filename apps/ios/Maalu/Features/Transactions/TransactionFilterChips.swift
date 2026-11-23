import SwiftUI

/// The active filters as chips you can drop one at a time.
struct TransactionFilterChips: View {
    let chips: [TransactionFilterChip]
    let onRemove: (TransactionFilterChip) -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let colors = ChipColors(tint: .brand, scheme: scheme)
        ScrollView(.horizontal) {
            HStack(spacing: 8) {
                ForEach(chips) { chip in
                    Button { onRemove(chip) } label: {
                        HStack(spacing: 6) {
                            Text(chip.title).lineLimit(1)
                            Image(systemName: "xmark").font(.caption2.weight(.bold))
                        }
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(colors.ink)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 7)
                        .background(colors.fill, in: .rect(cornerRadius: 8, style: .continuous))
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

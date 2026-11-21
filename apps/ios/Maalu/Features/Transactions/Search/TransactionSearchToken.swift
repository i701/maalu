import SwiftUI

/// A quick filter that is on, shown in the search field with a cross to turn it off.
struct TransactionSearchToken: View {
    let title: String
    let tint: Color
    let onRemove: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        let colors = ChipColors(tint: tint, scheme: scheme)
        Button(action: onRemove) {
            HStack(spacing: 4) {
                Text(title)
                Image(systemName: "xmark")
                    .imageScale(.small)
            }
            .font(.footnote.weight(.semibold))
            .fixedSize()
            .foregroundStyle(colors.ink)
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(colors.fill, in: .capsule)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Remove \(title) filter")
    }
}

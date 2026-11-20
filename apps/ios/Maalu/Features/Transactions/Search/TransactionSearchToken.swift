import SwiftUI

/// A quick filter that is on, shown in the search field with a cross to turn it off.
struct TransactionSearchToken: View {
    let title: String
    let tint: Color
    let onRemove: () -> Void

    var body: some View {
        Button(action: onRemove) {
            HStack(spacing: 4) {
                Text(title)
                Image(systemName: "xmark")
                    .imageScale(.small)
            }
            .font(.footnote.weight(.semibold))
            .fixedSize()
            .foregroundStyle(tint.mix(with: .black, by: 0.2))
            .padding(.horizontal, 10)
            .padding(.vertical, 6)
            .background(tint.opacity(0.14), in: .capsule)
        }
        .buttonStyle(.borderless)
        .accessibilityLabel("Remove \(title) filter")
    }
}

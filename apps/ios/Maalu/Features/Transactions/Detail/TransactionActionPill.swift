import SwiftUI

/// One of the main actions under the amount: a tinted capsule with an icon.
struct TransactionActionPill: View {
    let title: LocalizedStringResource
    let systemImage: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label { Text(title) } icon: { Image(systemName: systemImage) }
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(tint.mix(with: .black, by: 0.15))
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(tint.opacity(0.14), in: .capsule)
        }
        .buttonStyle(.borderless)
    }
}

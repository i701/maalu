import SwiftUI

/// One of the main actions under the amount: a tinted Liquid Glass capsule with an icon.
struct TransactionActionPill: View {
    let title: LocalizedStringResource
    let systemImage: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label { Text(title) } icon: { Image(systemName: systemImage) }
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .padding(.vertical, 6)
                .foregroundStyle(tint.mix(with: .black, by: 0.15))
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.capsule)
        .tint(tint.opacity(0.35))
    }
}

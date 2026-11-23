import SwiftUI

/// One of the main actions under the amount: a tinted Liquid Glass capsule with just its text.
struct TransactionActionPill: View {
    let title: LocalizedStringResource
    let tint: Color
    let action: () -> Void
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .lineLimit(1)
                .padding(.vertical, 6)
                .padding(.horizontal, 6)
                .foregroundStyle(scheme == .dark ? tint.mix(with: .white, by: 0.55) : tint.mix(with: .black, by: 0.15))
        }
        .buttonStyle(.glass)
        .buttonBorderShape(.capsule)
        .tint(tint.opacity(0.35))
    }
}

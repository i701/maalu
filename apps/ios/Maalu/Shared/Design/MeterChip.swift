import SwiftUI

/// A legend chip under a meter or chart: a colour and a name. Tap it to hold that category, tap again to let go.
struct MeterChip: View {
    let name: String
    let color: Color
    /// What VoiceOver adds after the name: the amount and share.
    let value: String
    let isOn: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 8) {
                RoundedRectangle(cornerRadius: 2, style: .continuous)
                    .fill(color)
                    .frame(width: 8, height: 8)
                Text(name)
                    .font(.footnote)
                    .lineLimit(1)
            }
            .padding(.horizontal, 12)
            .frame(height: 32)
            .background(Color.primary.opacity(isOn ? 0.14 : 0.06), in: .capsule)
            .scaleEffect(isOn ? 0.975 : 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel(name)
        .accessibilityValue(value)
        .accessibilityAddTraits(isOn ? .isSelected : [])
    }
}

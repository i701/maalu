import SwiftUI

/// The arrow on the seam between the slabs. It turns half a turn each press, always the same way, and goes while a slab is open.
struct TransferFlipButton: View {
    let turns: Int
    let isHidden: Bool
    let action: () -> Void

    var body: some View {
        Button("Swap the accounts", systemImage: "arrow.down", action: action)
            .labelStyle(.iconOnly)
            .font(.body.weight(.semibold))
            .foregroundStyle(.primary)
            .rotationEffect(.degrees(Double(turns) * 180))
            .frame(width: 40, height: 40)
            .background(Color.primary.opacity(0.06), in: .circle)
            .background(Color(.secondarySystemGroupedBackground), in: .circle)
            .scaleEffect(isHidden ? 0.5 : 1)
            .opacity(isHidden ? 0 : 1)
            .allowsHitTesting(!isHidden)
            .zIndex(2)
            .buttonStyle(.plain)
    }
}

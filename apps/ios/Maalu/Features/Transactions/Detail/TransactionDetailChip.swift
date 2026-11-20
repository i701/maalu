import SwiftUI

/// A small tinted label under the amount: planned, a refund, fully refunded.
struct TransactionDetailChip: View {
    let text: String
    let tint: Color

    var body: some View {
        Text(text)
            .font(.caption.weight(.semibold))
            .foregroundStyle(tint.mix(with: .black, by: 0.2))
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(tint.opacity(0.14), in: .capsule)
    }
}

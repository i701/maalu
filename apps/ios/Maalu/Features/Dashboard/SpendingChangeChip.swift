import SwiftUI

struct SpendingChangeChip: View {
    let change: SpendingChange

    var body: some View {
        Label(change.text, systemImage: change.symbol)
            .font(.caption.weight(.semibold))
            .foregroundStyle(change.isGood ? Color.success : Color.red)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background((change.isGood ? Color.success : Color.red).opacity(0.12), in: .capsule)
    }
}

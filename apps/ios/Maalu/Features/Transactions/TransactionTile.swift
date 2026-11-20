import SwiftUI

/// A small tinted tile with the direction of the money: the only colour in a row besides income's green.
struct TransactionTile: View {
    let type: TransactionType

    var body: some View {
        Image(systemName: symbol)
            .font(.headline)
            .foregroundStyle(type == .income ? Color.green : Color.secondary)
            .frame(width: 40, height: 40)
            .background((type == .income ? Color.green : Color.secondary).opacity(0.14), in: .rect(cornerRadius: 12))
            .accessibilityHidden(true)
    }

    private var symbol: String {
        switch type {
        case .income: "arrow.down.left"
        case .expense: "arrow.up.right"
        case .transfer: "arrow.left.arrow.right"
        }
    }
}

import SwiftUI

/// "Planned" or "Overdue" under the amount of a transaction that has not happened yet.
struct TransactionStatusPill: View {
    let transaction: Transaction

    var body: some View {
        let overdue = transaction.isOverdue()
        Text(overdue ? "Overdue" : "Planned")
            .font(.caption)
            .fontWeight(.medium)
            .foregroundStyle(overdue ? Color.orange : Color.secondary)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .background((overdue ? Color.orange : Color.secondary).opacity(0.14), in: .capsule)
    }
}

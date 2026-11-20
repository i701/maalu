import SwiftUI

struct TransactionDaySection: View {
    let day: TransactionDay
    let onOpen: (Transaction) -> Void

    var body: some View {
        Section {
            ForEach(day.transactions) { transaction in
                Button { onOpen(transaction) } label: {
                    TransactionRow(transaction: transaction)
                        .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text(day.heading())
        }
    }
}

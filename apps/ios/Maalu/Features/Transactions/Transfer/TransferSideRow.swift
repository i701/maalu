import SwiftUI

/// One half of a possible transfer: which way the money went, what it was, where and when, and how much.
struct TransferSideRow: View {
    let label: LocalizedStringResource
    let transaction: Transaction

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Text(label).font(.caption).foregroundStyle(.secondary).frame(width: 28, alignment: .leading)
            VStack(alignment: .leading, spacing: 2) {
                Text(transaction.title).lineLimit(1)
                Text(details).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
            }
            Spacer()
            TransactionAmount(transaction: transaction)
        }
    }

    private var details: String {
        let day = ISODate.date(transaction.transactionDate)?.formatted(.dateTime.day().month(.abbreviated)) ?? transaction.transactionDate
        return [transaction.account?.name, day].compactMap { $0 }.joined(separator: " · ")
    }
}

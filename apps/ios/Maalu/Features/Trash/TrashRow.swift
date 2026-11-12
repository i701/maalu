import SwiftUI

struct TrashRow: View {
    let transaction: Transaction

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(transaction.title)
                if let date = transaction.deletedDay.flatMap(ISODate.date) {
                    Text("Deleted \(date, format: .dateTime.day().month(.abbreviated).year())")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        } amount: {
            TransactionAmount(transaction: transaction)
        }
    }
}

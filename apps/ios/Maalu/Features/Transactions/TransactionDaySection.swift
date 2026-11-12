import SwiftUI

struct TransactionDaySection: View {
    let day: TransactionDay

    var body: some View {
        Section {
            ForEach(day.transactions) { transaction in
                NavigationLink(value: transaction) {
                    TransactionRow(transaction: transaction)
                }
            }
        } header: {
            if let date = day.parsedDate {
                Text(date, format: .dateTime.weekday(.wide).day().month(.wide))
            } else {
                Text(day.date)
            }
        }
    }
}

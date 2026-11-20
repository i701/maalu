import Foundation

struct TransactionDay: Identifiable {
    let date: String
    let transactions: [Transaction]

    var id: String { date }

    static func grouping(_ transactions: [Transaction]) -> [TransactionDay] {
        var days: [TransactionDay] = []
        for transaction in transactions {
            if let last = days.last, last.date == transaction.transactionDate {
                days[days.count - 1] = TransactionDay(date: last.date, transactions: last.transactions + [transaction])
            } else {
                days.append(TransactionDay(date: transaction.transactionDate, transactions: [transaction]))
            }
        }
        return days
    }

    var parsedDate: Date? {
        ISODate.date(date)
    }

    /// "Today", "Yesterday", "Tomorrow" or the date, instead of a date on every row.
    func heading(calendar: Calendar = .current) -> String {
        guard let parsedDate else { return date }
        if calendar.isDateInToday(parsedDate) { return String(localized: "Today") }
        if calendar.isDateInYesterday(parsedDate) { return String(localized: "Yesterday") }
        if calendar.isDateInTomorrow(parsedDate) { return String(localized: "Tomorrow") }
        return parsedDate.formatted(.dateTime.weekday(.wide).day().month(.wide))
    }
}

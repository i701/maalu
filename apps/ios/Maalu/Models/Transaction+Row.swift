import Foundation

/// What the compact list shows of a transaction; everything else waits in its detail sheet.
extension Transaction {
    /// The vendor, else what was typed as the description, else the category; a transfer reads "From → To".
    var rowTitle: String {
        guard type == .transfer else { return title }
        let names = [account?.name, toAccount?.name].map { $0 ?? String(localized: "Deleted account") }
        return names.joined(separator: " → ")
    }

    /// The category on the row's label ("Transfer" for a transfer), with how many more a split touches ("Groceries +1").
    var rowTag: String {
        guard type != .transfer else { return String(localized: "Transfer") }
        let categories = splits.count > 1 ? splits.map(\.category).reduce(into: [String]()) { if !$0.contains($1) { $0.append($1) } } : [category]
        return categories.count > 1 ? "\(categories[0]) +\(categories.count - 1)" : categories[0]
    }

    /// A planned transaction whose day has passed: it just stays planned, the app calls it overdue.
    func isOverdue(today: Date = .now) -> Bool {
        guard planned, let date = ISODate.date(transactionDate) else { return false }
        return date < Calendar.current.startOfDay(for: today)
    }
}

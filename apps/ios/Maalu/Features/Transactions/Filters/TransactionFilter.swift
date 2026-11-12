import Foundation

struct TransactionFilter: Hashable {
    var text = ""
    var type: TransactionType?
    /// Show what is coming up instead of what happened.
    var planned = false
    var dateFrom: Date?
    var dateTo: Date?
    var accountID: String?
    var categoryID: String?
    var tagIDs: Set<String> = []
    var matchesAllTags = false
    var minAmount: Decimal?
    var maxAmount: Decimal?

    /// What the date pickers show: the chosen day, or today while none is chosen.
    var fromDate: Date {
        get { dateFrom ?? .now }
        set { dateFrom = newValue }
    }

    var toDate: Date {
        get { dateTo ?? .now }
        set { dateTo = newValue }
    }

    /// How many of the sheet's filters are set (the search text and the type menu are not counted).
    var detailCount: Int {
        let dates = dateFrom != nil || dateTo != nil ? 1 : 0
        let amounts = minAmount != nil || maxAmount != nil ? 1 : 0
        return dates + amounts + [accountID, categoryID].compactMap { $0 }.count + (tagIDs.isEmpty ? 0 : 1)
    }

    var isActive: Bool { !text.trimmingCharacters(in: .whitespaces).isEmpty || type != nil || planned || detailCount > 0 }

    func clearingDetails() -> TransactionFilter {
        TransactionFilter(text: text, type: type, planned: planned)
    }

    var queryItems: [URLQueryItem] {
        var items: [URLQueryItem] = []
        let text = text.trimmingCharacters(in: .whitespaces)
        if !text.isEmpty { items.append(URLQueryItem(name: "q", value: text)) }
        if let type { items.append(URLQueryItem(name: "type", value: type.rawValue)) }
        if planned { items.append(URLQueryItem(name: "planned", value: "true")) }
        if let dateFrom { items.append(URLQueryItem(name: "date_from", value: ISODate.string(dateFrom))) }
        if let dateTo { items.append(URLQueryItem(name: "date_to", value: ISODate.string(dateTo))) }
        if let accountID { items.append(URLQueryItem(name: "account_id", value: accountID)) }
        if let categoryID { items.append(URLQueryItem(name: "category_id", value: categoryID)) }
        if !tagIDs.isEmpty {
            items += tagIDs.sorted().map { URLQueryItem(name: "tag_id", value: $0) }
            items.append(URLQueryItem(name: "tag_match", value: matchesAllTags ? "all" : "any"))
        }
        if let minAmount { items.append(URLQueryItem(name: "min_amount", value: Money.string(minAmount))) }
        if let maxAmount { items.append(URLQueryItem(name: "max_amount", value: Money.string(maxAmount))) }
        return items
    }
}

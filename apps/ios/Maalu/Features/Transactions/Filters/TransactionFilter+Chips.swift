import Foundation

extension TransactionFilter {
    /// What is set besides the search text (which the search field shows), by name where the filter only holds an id.
    func chips(accounts: [Account], categories: [NamedRef], cards: [NamedRef], tags: [NamedRef]) -> [TransactionFilterChip] {
        var chips: [TransactionFilterChip] = []
        if let type { chips.append(TransactionFilterChip(kind: .type, title: String(localized: type.title))) }
        if planned { chips.append(TransactionFilterChip(kind: .planned, title: String(localized: "Planned"))) }
        if dateFrom != nil || dateTo != nil { chips.append(TransactionFilterChip(kind: .dates, title: dateTitle)) }
        if let accountID { chips.append(TransactionFilterChip(kind: .account, title: accounts.first { $0.id == accountID }?.name ?? String(localized: "Account"))) }
        if let categoryID { chips.append(TransactionFilterChip(kind: .category, title: categories.first { $0.id == categoryID }?.name ?? String(localized: "Category"))) }
        if let cardID { chips.append(TransactionFilterChip(kind: .card, title: cards.first { $0.id == cardID }?.name ?? String(localized: "Card"))) }
        if let paymentMethod { chips.append(TransactionFilterChip(kind: .method, title: String(localized: paymentMethod.title))) }
        if let kind { chips.append(TransactionFilterChip(kind: .kind, title: String(localized: kind.title))) }
        if minAmount != nil || maxAmount != nil { chips.append(TransactionFilterChip(kind: .amount, title: amountTitle)) }
        for id in tagIDs.sorted() {
            chips.append(TransactionFilterChip(kind: .tag(id), title: "#" + (tags.first { $0.id == id }?.name ?? String(localized: "Tag"))))
        }
        return chips
    }

    func removing(_ chip: TransactionFilterChip.Kind) -> TransactionFilter {
        var copy = self
        switch chip {
        case .type: copy.type = nil
        case .planned: copy.planned = false
        case .dates: copy.dateFrom = nil; copy.dateTo = nil
        case .account: copy.accountID = nil
        case .category: copy.categoryID = nil
        case .card: copy.cardID = nil
        case .method: copy.paymentMethod = nil
        case .kind: copy.kind = nil
        case .amount: copy.minAmount = nil; copy.maxAmount = nil
        case .tag(let id): copy.tagIDs.remove(id)
        }
        return copy
    }

    private var dateTitle: String {
        let day = { (date: Date) in date.formatted(.dateTime.day().month(.abbreviated)) }
        switch (dateFrom, dateTo) {
        case (let from?, let to?): return "\(day(from)) – \(day(to))"
        case (let from?, nil): return String(localized: "From \(day(from))")
        case (nil, let to?): return String(localized: "Until \(day(to))")
        case (nil, nil): return ""
        }
    }

    private var amountTitle: String {
        [minAmount.map { "≥ \($0.formatted())" }, maxAmount.map { "≤ \($0.formatted())" }].compactMap { $0 }.joined(separator: " ")
    }
}

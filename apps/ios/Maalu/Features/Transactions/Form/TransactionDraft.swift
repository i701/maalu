import Foundation

struct TransactionDraft {
    var type: TransactionType = .expense
    var amount: Decimal?
    var accountID: String?
    var toAccountID: String?
    var toAmount: Decimal?
    var category = ""
    var vendor = ""
    var date = Date.now
    /// Only the hour and minute count; nil when the time of day is not known.
    var time: Date?
    var tags: [String] = []
    var cardID: String?
    var note = ""
    var method: PaymentMethod = .other
    var rate: Decimal?
    /// A planned transaction counts toward nothing until it is marked as paid.
    var planned = false
    /// Where it happened, if marked on the map; a copy and "add another" keep it, a template has none.
    var location: TransactionLocation?
    /// A purchase split into items: the amount is then their total and the category the biggest item's.
    var isSplit = false
    var items: [PurchaseItemDraft] = []
    var taxMode = TaxMode.none
    /// The GST rate in percent, such as 8.
    var taxRate: Decimal?

    init() {}

    /// Repaying a credit card: a transfer from the account it is repaid from into the card's own account, as on the web.
    init(repaying card: Card, amount: Decimal? = nil) {
        type = .transfer
        self.amount = amount
        accountID = card.repayAccount?.id
        toAccountID = card.account.id
        note = String(localized: "\(card.name) repayment")
        method = .bankTransfer
    }

    /// A template never carries a date, so the date is today and the rate comes from the account.
    init(startingFrom template: TransactionTemplate) {
        type = template.type
        amount = template.amount.flatMap(Money.decimal)
        accountID = template.account?.id
        toAccountID = template.toAccount?.id
        category = template.type == .transfer ? "" : template.category ?? ""
        vendor = template.type == .transfer ? "" : template.vendor ?? ""
        note = template.description ?? ""
        method = template.paymentMethod
    }

    init(editing transaction: Transaction) {
        type = transaction.type
        amount = Money.decimal(transaction.amount)
        accountID = transaction.account?.id
        toAccountID = transaction.toAccount?.id
        toAmount = transaction.toAmount.flatMap(Money.decimal)
        category = transaction.category
        vendor = transaction.vendor?.name ?? ""
        date = ISODate.date(transaction.transactionDate) ?? .now
        time = transaction.transactionTime.flatMap { ClockTime.date($0) }
        tags = transaction.tags.map(\.name)
        cardID = transaction.card?.id
        note = transaction.description ?? ""
        method = transaction.paymentMethod
        rate = Money.decimal(transaction.exchangeRate)
        planned = transaction.planned
        location = transaction.location
        if !transaction.splits.isEmpty {
            isSplit = true
            items = transaction.splits.map(PurchaseItemDraft.init(saved:))
            if let taxed = transaction.splits.first(where: { Money.decimal($0.taxAmount ?? "0") ?? 0 > 0 }),
               let amount = Money.decimal(taxed.amount), let tax = Money.decimal(taxed.taxAmount ?? ""), amount > tax {
                // the rate the saved tax works out at, so an item edited later is taxed the same way
                taxMode = .included
                taxRate = PurchaseItemDraft.rounded(tax / (amount - tax) * 100, places: 2)
            }
        }
    }

    /// A copy dated today and not planned; the rate comes fresh from the account.
    init(duplicating transaction: Transaction) {
        self.init(editing: transaction)
        date = .now
        time = nil
        rate = nil
        planned = false
    }

    /// What "Save and add another" leaves on the form: where the money went and how, and where it happened, without the amount or note.
    func nextEntry() -> TransactionDraft {
        var next = TransactionDraft()
        next.type = type
        next.accountID = accountID
        next.toAccountID = type == .transfer ? toAccountID : nil
        next.category = category
        next.vendor = vendor
        next.method = method
        next.tags = tags
        next.cardID = type == .expense ? cardID : nil
        next.location = location
        return next
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    /// Whether the items count: a transfer is never split.
    var hasItems: Bool { isSplit && type != .transfer }

    /// The sum of the complete items' line totals.
    var itemsTotal: Decimal {
        items.compactMap { $0.line(mode: taxMode, rate: taxRate)?.amount }.reduce(0, +)
    }

    /// What the transaction comes to: the amount typed, or with items their total.
    var effectiveAmount: Decimal? { hasItems ? itemsTotal : amount }

    /// The first thing wrong with the items, or nil.
    var itemsProblem: LocalizedStringResource? {
        if items.isEmpty { return "Add at least one item." }
        let needsRate = taxMode != .none && items.contains { $0.lockedAmount == nil }
        if needsRate, (taxRate ?? 0) <= 0 { return "Enter the GST rate, for example 8." }
        for (index, item) in items.enumerated() {
            let name = item.name.trimmingCharacters(in: .whitespaces)
            if name.isEmpty { return "Item \(index + 1) needs a name." }
            if item.category.trimmingCharacters(in: .whitespaces).isEmpty { return "\(name) needs a category." }
            if item.line(mode: taxMode, rate: taxRate) == nil { return "\(name) needs a quantity and a price." }
        }
        return nil
    }

    /// The items as the API takes them: the line total and the tax in it.
    var splitRequests: [SplitRequest] {
        items.compactMap { item in
            guard let line = item.line(mode: taxMode, rate: taxRate) else { return nil }
            return SplitRequest(
                name: item.name.trimmingCharacters(in: .whitespaces),
                quantity: Money.string(PurchaseItemDraft.rounded(item.quantity ?? 1, places: 3)),
                category: item.category.trimmingCharacters(in: .whitespaces),
                amount: Money.string(line.amount),
                taxAmount: line.tax.map(Money.string)
            )
        }
    }

    func problem(accounts: [Account], baseCurrency: String) -> LocalizedStringResource? {
        if hasItems, let itemsProblem { return itemsProblem }
        guard let amount = effectiveAmount, amount > 0 else { return hasItems ? "The items add up to nothing." : "Enter an amount above zero." }
        let from = accounts.first { $0.id == accountID }
        if type == .transfer {
            let to = accounts.first { $0.id == toAccountID }
            guard let from else { return "Pick the account the money leaves." }
            guard let to else { return "Pick the account it arrives in." }
            if from.id == to.id { return "A transfer needs two different accounts." }
            if from.currency != to.currency, (toAmount ?? 0) <= 0 { return "Enter how much arrives in the other currency." }
            return nil
        }
        if !hasItems, category.trimmingCharacters(in: .whitespaces).isEmpty { return "Choose a category." }
        if let from, from.currency != baseCurrency, (rate ?? 0) <= 0 { return "Enter the exchange rate." }
        return nil
    }

    func request(accounts: [Account], baseCurrency: String, editing original: Transaction?) -> TransactionRequest {
        let from = accounts.first { $0.id == accountID }
        let to = accounts.first { $0.id == toAccountID }
        var request = TransactionRequest(
            type: type,
            amount: Money.string(effectiveAmount ?? 0),
            transactionDate: ISODate.string(date),
            accountId: from?.id,
            planned: planned ? true : (original?.planned == true ? false : nil)
        )
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        request.description = note.isEmpty ? nil : note
        request.clearsDescription = original != nil && note.isEmpty
        request.transactionTime = time.map { ClockTime.string($0) }
        request.clearsTime = original?.transactionTime != nil && time == nil
        // on an edit the list replaces the tags, so an empty one removes them
        request.tags = original != nil || !tags.isEmpty ? tags : nil
        // only an expense is paid with a card
        request.cardId = type == .expense ? cardID : nil
        request.clearsCard = original?.card != nil && request.cardId == nil
        request.location = location
        request.clearsLocation = original?.location != nil && location == nil

        if type == .transfer {
            request.toAccountId = to?.id
            if let from, let to, from.currency != to.currency { request.toAmount = toAmount.map(Money.string) }
            return request
        }
        if hasItems {
            // the API takes the category from the biggest item
            request.splits = splitRequests
        } else {
            request.category = category.trimmingCharacters(in: .whitespaces)
            request.clearsSplits = original?.splits.isEmpty == false
        }
        let vendor = vendor.trimmingCharacters(in: .whitespaces)
        request.vendorName = vendor.isEmpty ? nil : vendor
        request.clearsVendor = original != nil && vendor.isEmpty
        request.paymentMethod = method
        if let from, from.currency != baseCurrency {
            request.currency = from.currency
            request.exchangeRate = rate.map(Money.string)
        }
        return request
    }

    var isFuture: Bool {
        Calendar.current.startOfDay(for: date) > Calendar.current.startOfDay(for: .now)
    }
}

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

    init() {}

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
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    func problem(accounts: [Account], baseCurrency: String) -> LocalizedStringResource? {
        guard let amount, amount > 0 else { return "Enter an amount above zero." }
        let from = accounts.first { $0.id == accountID }
        if type == .transfer {
            let to = accounts.first { $0.id == toAccountID }
            guard let from else { return "Pick the account the money leaves." }
            guard let to else { return "Pick the account it arrives in." }
            if from.id == to.id { return "A transfer needs two different accounts." }
            if from.currency != to.currency, (toAmount ?? 0) <= 0 { return "Enter how much arrives in the other currency." }
            return nil
        }
        if category.trimmingCharacters(in: .whitespaces).isEmpty { return "Choose a category." }
        if let from, from.currency != baseCurrency, (rate ?? 0) <= 0 { return "Enter the exchange rate." }
        return nil
    }

    func request(accounts: [Account], baseCurrency: String, editing original: Transaction?) -> TransactionRequest {
        let from = accounts.first { $0.id == accountID }
        let to = accounts.first { $0.id == toAccountID }
        var request = TransactionRequest(
            type: type,
            amount: Money.string(amount ?? 0),
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

        if type == .transfer {
            request.toAccountId = to?.id
            if let from, let to, from.currency != to.currency { request.toAmount = toAmount.map(Money.string) }
            return request
        }
        request.category = category.trimmingCharacters(in: .whitespaces)
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

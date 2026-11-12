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
    var note = ""
    var method: PaymentMethod = .other
    var rate: Decimal?
    /// A planned transaction counts toward nothing until it is marked as paid.
    var planned = false

    init() {}

    init(editing transaction: Transaction) {
        type = transaction.type
        amount = Money.decimal(transaction.amount)
        accountID = transaction.account?.id
        toAccountID = transaction.toAccount?.id
        toAmount = transaction.toAmount.flatMap(Money.decimal)
        category = transaction.category
        vendor = transaction.vendor?.name ?? ""
        date = ISODate.date(transaction.transactionDate) ?? .now
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

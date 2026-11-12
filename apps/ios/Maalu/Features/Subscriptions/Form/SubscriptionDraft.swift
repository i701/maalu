import Foundation

struct SubscriptionDraft: Equatable {
    var name = ""
    var amount: Decimal?
    var amountVaries = false
    var accountID: String?
    var rate: Decimal?
    var vendor = ""
    var category = ""
    var method = PaymentMethod.bankTransfer
    var unit = IntervalUnit.month
    var count: Int? = 1
    var startDate = Date.now
    var status = SubscriptionStatus.active
    /// Nil: it goes on.
    var installments: Int?
    /// Days before a payment to be reminded; nil is never.
    var remind: Int? = 3

    init() {}

    init(editing subscription: Subscription) {
        name = subscription.name
        amount = Money.decimal(subscription.amount)
        amountVaries = subscription.amountVaries
        accountID = subscription.account?.id
        rate = Money.decimal(subscription.exchangeRate)
        vendor = subscription.vendor?.name ?? ""
        category = subscription.category
        method = subscription.paymentMethod
        unit = subscription.intervalUnit
        count = subscription.intervalCount
        startDate = ISODate.date(subscription.startDate) ?? .now
        status = subscription.status == .completed ? .active : subscription.status
        installments = subscription.installmentsTotal
        remind = subscription.remindDaysBefore
    }

    func currency(accounts: [Account], baseCurrency: String) -> String {
        accounts.first { $0.id == accountID }?.currency ?? baseCurrency
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    func problem(accounts: [Account], baseCurrency: String) -> LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the subscription a name." }
        if (amount ?? 0) <= 0 { return "Enter an amount above zero." }
        if category.trimmingCharacters(in: .whitespaces).isEmpty { return "Choose a category." }
        if (count ?? 0) < 1 { return "How often must be a whole number, 1 or more." }
        if let installments, !(1...600).contains(installments) { return "The number of payments is a whole number from 1 to 600." }
        if currency(accounts: accounts, baseCurrency: baseCurrency) != baseCurrency, (rate ?? 0) <= 0 { return "Enter the exchange rate." }
        return nil
    }

    func createRequest(accounts: [Account], baseCurrency: String) -> SubscriptionRequest {
        var request = SubscriptionRequest()
        request.name = name.trimmingCharacters(in: .whitespaces)
        request.amount = amount.map(Money.string)
        request.category = category.trimmingCharacters(in: .whitespaces)
        request.paymentMethod = method
        request.intervalUnit = unit
        request.intervalCount = count
        request.startDate = ISODate.string(startDate)
        request.status = status
        request.accountId = accountID
        let currency = currency(accounts: accounts, baseCurrency: baseCurrency)
        if currency != baseCurrency {
            request.currency = currency
            request.exchangeRate = rate.map(Money.string)
        }
        request.vendorName = Self.trimmed(vendor)
        request.installmentsTotal = installments
        request.remindDaysBefore = remind
        if remind == nil { request.clear(.remindDaysBefore) }
        if amountVaries { request.amountVaries = true }
        return request
    }

    /// Only what changed. Clearing the vendor, account, number of payments or reminder is sent as an explicit null.
    func patchRequest(from original: SubscriptionDraft, accounts: [Account], baseCurrency: String) -> SubscriptionRequest {
        var request = SubscriptionRequest()
        if name != original.name { request.name = name.trimmingCharacters(in: .whitespaces) }
        if amount != original.amount { request.amount = amount.map(Money.string) }
        if category != original.category { request.category = category.trimmingCharacters(in: .whitespaces) }
        if method != original.method { request.paymentMethod = method }
        if unit != original.unit { request.intervalUnit = unit }
        if count != original.count { request.intervalCount = count }
        if startDate != original.startDate { request.startDate = ISODate.string(startDate) }
        if status != original.status { request.status = status }
        if amountVaries != original.amountVaries { request.amountVaries = amountVaries }
        if accountID != original.accountID {
            request.accountId = accountID
            if accountID == nil { request.clear(.accountId) }
        }
        if accountID != original.accountID || rate != original.rate {
            let currency = currency(accounts: accounts, baseCurrency: baseCurrency)
            request.currency = currency
            if currency != baseCurrency { request.exchangeRate = rate.map(Money.string) }
        }
        if Self.trimmed(vendor) != Self.trimmed(original.vendor) {
            request.vendorName = Self.trimmed(vendor)
            if Self.trimmed(vendor) == nil { request.clear(.vendorName) }
        }
        if installments != original.installments {
            request.installmentsTotal = installments
            if installments == nil { request.clear(.installmentsTotal) }
        }
        if remind != original.remind {
            request.remindDaysBefore = remind
            if remind == nil { request.clear(.remindDaysBefore) }
        }
        return request
    }

    private static func trimmed(_ text: String) -> String? {
        let value = text.trimmingCharacters(in: .whitespaces)
        return value.isEmpty ? nil : value
    }
}

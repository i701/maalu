import Foundation

struct AccountDraft: Equatable {
    var group = AccountGroup.accounts
    var name = ""
    var currency = ""
    var rate: Decimal?
    var autoRate = false
    var opening: Decimal? = 0
    var bank = ""
    var number = ""
    var note = ""
    var creditLimit: Decimal?
    var statementDay: Int?
    var dueDay: Int?
    var excludesFromStats = false
    /// Nil follows the group.
    var spendable: Bool?

    init() {}

    init(editing account: Account) {
        group = account.group
        name = account.name
        currency = account.currency
        rate = Money.decimal(account.exchangeRate)
        autoRate = account.autoRate
        opening = Money.decimal(account.openingAmount)
        bank = account.bank ?? ""
        number = account.accountNumber ?? ""
        note = account.description ?? ""
        creditLimit = account.creditLimit.flatMap(Money.decimal)
        statementDay = account.statementDay
        dueDay = account.dueDay
        excludesFromStats = account.excludeFromStats
        spendable = account.spendable
    }

    func isForeign(base: String) -> Bool { !currency.isEmpty && currency != base }

    /// Follows the group until it is touched, and goes back to following it when set to what the group says.
    var spendsFromThis: Bool {
        get { spendable ?? group.isSpendableByDefault }
        set { spendable = newValue == group.isSpendableByDefault ? nil : newValue }
    }

    /// The first thing wrong with the draft, or nil when it can be sent. The server checks everything again.
    func problem(baseCurrency: String) -> LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the account a name." }
        if isForeign(base: baseCurrency), (rate ?? 0) <= 0 { return "Enter the exchange rate." }
        if opening == nil { return "The opening amount must be a number." }
        if group.hasCreditLimit, let creditLimit, creditLimit < 0 { return "The credit limit must be zero or more." }
        if group == .card, (statementDay == nil) != (dueDay == nil) {
            return "Give both the day the statement closes and the day it is due."
        }
        if group == .card, let problem = Self.dayProblem(statementDay) ?? Self.dayProblem(dueDay) { return problem }
        return nil
    }

    private static func dayProblem(_ day: Int?) -> LocalizedStringResource? {
        guard let day else { return nil }
        return (1...31).contains(day) ? nil : "Days are whole numbers from 1 to 31."
    }

    func createRequest(baseCurrency: String) -> AccountRequest {
        var request = AccountRequest()
        request.group = group
        request.name = name.trimmingCharacters(in: .whitespaces)
        request.currency = currency.isEmpty ? nil : currency
        if isForeign(base: baseCurrency) {
            request.exchangeRate = rate.map(Money.string)
            request.autoRate = autoRate ? true : nil
        }
        request.openingAmount = Money.string(opening ?? 0)
        request.bank = Self.trimmed(bank)
        request.accountNumber = Self.trimmed(number)
        request.description = Self.trimmed(note)
        if group.hasCreditLimit { request.creditLimit = creditLimit.map(Money.string) }
        if group == .card, let statementDay, let dueDay {
            request.statementDay = statementDay
            request.dueDay = dueDay
        }
        request.excludeFromStats = excludesFromStats ? true : nil
        if !group.isLiability, let spendable, spendable != group.isSpendableByDefault { request.spendable = spendable }
        return request
    }

    /// Only what changed. Clearing a text field or a number on an edit is sent as an explicit null.
    func patchRequest(from original: AccountDraft, baseCurrency: String) -> AccountRequest {
        var request = AccountRequest()
        if group != original.group { request.group = group }
        if name != original.name { request.name = name.trimmingCharacters(in: .whitespaces) }
        if currency != original.currency { request.currency = currency }
        if rate != original.rate || currency != original.currency, isForeign(base: baseCurrency) { request.exchangeRate = rate.map(Money.string) }
        if autoRate != original.autoRate { request.autoRate = autoRate }
        if opening != original.opening { request.openingAmount = Money.string(opening ?? 0) }
        Self.change(bank, from: original.bank, key: .bank, request: &request) { $0.bank = $1 }
        Self.change(number, from: original.number, key: .accountNumber, request: &request) { $0.accountNumber = $1 }
        Self.change(note, from: original.note, key: .description, request: &request) { $0.description = $1 }
        if creditLimit != original.creditLimit {
            request.creditLimit = creditLimit.map(Money.string)
            if creditLimit == nil { request.clear(.creditLimit) }
        }
        if statementDay != original.statementDay || dueDay != original.dueDay {
            request.statementDay = statementDay
            request.dueDay = dueDay
            if statementDay == nil { request.clear(.statementDay, .dueDay) }
        }
        if excludesFromStats != original.excludesFromStats { request.excludeFromStats = excludesFromStats }
        if spendable != original.spendable {
            request.spendable = spendable
            if spendable == nil { request.clear(.spendable) }
        }
        return request
    }

    private static func change(_ new: String, from old: String, key: AccountRequest.Key, request: inout AccountRequest, apply: (inout AccountRequest, String?) -> Void) {
        let value = trimmed(new)
        guard value != trimmed(old) else { return }
        apply(&request, value)
        if value == nil { request.clear(key) }
    }

    private static func trimmed(_ text: String) -> String? {
        let value = text.trimmingCharacters(in: .whitespaces)
        return value.isEmpty ? nil : value
    }
}

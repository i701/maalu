import Foundation
import Testing
@testable import Maalu

struct AccountDraftTests {
    private func account(group: String = "accounts", currency: String = "MVR", bank: String? = "BML", limit: String? = nil, statement: Int? = nil, due: Int? = nil) throws -> Account {
        let bankJSON = bank.map { "\"\($0)\"" } ?? "null"
        let limitJSON = limit.map { "\"\($0)\"" } ?? "null"
        return try Api.decoder.decode(Account.self, from: Data(#"""
        {"id":"a","name":"Main","group":"\#(group)","currency":"\#(currency)","balance":"100","base_balance":"100","opening_amount":"50.0000",
         "exchange_rate":"1.00000000","auto_rate":false,"bank":\#(bankJSON),"account_number":"123","description":null,
         "credit_limit":\#(limitJSON),"statement_day":\#(statement.map(String.init) ?? "null"),"due_day":\#(due.map(String.init) ?? "null"),
         "exclude_from_stats":false,"spendable":null,"archived_at":null,"transaction_count":3}
        """#.utf8))
    }

    private func json(_ request: AccountRequest) throws -> [String: Any] {
        let encoder = JSONEncoder()
        return try #require(try JSONSerialization.jsonObject(with: try encoder.encode(request)) as? [String: Any])
    }

    @Test func aNewAccountNeedsANameAndAnOpeningAmount() {
        var draft = AccountDraft()
        #expect(draft.problem(baseCurrency: "MVR") != nil)
        draft.name = "Wallet"
        #expect(draft.problem(baseCurrency: "MVR") == nil)
        draft.opening = nil
        #expect(draft.problem(baseCurrency: "MVR") != nil)
    }

    @Test func aForeignAccountNeedsARate() {
        var draft = AccountDraft()
        draft.name = "Dollars"
        draft.currency = "USD"
        #expect(draft.problem(baseCurrency: "MVR") != nil)
        draft.rate = 15.42
        #expect(draft.problem(baseCurrency: "MVR") == nil)
        draft.currency = "MVR"
        draft.rate = nil
        #expect(draft.problem(baseCurrency: "MVR") == nil)
    }

    @Test func aCardNeedsBothStatementDaysOrNeitherAndWithinAMonth() {
        var draft = AccountDraft()
        draft.name = "Visa"
        draft.group = .card
        #expect(draft.problem(baseCurrency: "MVR") == nil)
        draft.statementDay = 5
        #expect(draft.problem(baseCurrency: "MVR") != nil)
        draft.dueDay = 40
        #expect(draft.problem(baseCurrency: "MVR") != nil)
        draft.dueDay = 25
        #expect(draft.problem(baseCurrency: "MVR") == nil)
    }

    @Test func creatingSendsOnlyWhatFitsTheGroup() throws {
        var draft = AccountDraft()
        draft.name = " Visa "
        draft.group = .card
        draft.currency = "MVR"
        draft.creditLimit = 5000
        draft.statementDay = 5
        draft.dueDay = 25
        draft.bank = "BML"
        let body = try json(draft.createRequest(baseCurrency: "MVR"))
        #expect(body["name"] as? String == "Visa")
        #expect(body["group"] as? String == "card")
        #expect(body["credit_limit"] as? String == "5000")
        #expect(body["statement_day"] as? Int == 5)
        #expect(body["bank"] as? String == "BML")
        #expect(body["exchange_rate"] == nil)
        #expect(body["spendable"] == nil)

        var plain = AccountDraft()
        plain.name = "Wallet"
        plain.group = .cash
        plain.creditLimit = 9
        #expect(try json(plain.createRequest(baseCurrency: "MVR"))["credit_limit"] == nil)
    }

    @Test func anEditSendsOnlyWhatChangedAndClearsWithNull() throws {
        let original = AccountDraft(editing: try account())
        #expect(original.opening == 50)

        var renamed = original
        renamed.name = "Primary"
        let body = try json(renamed.patchRequest(from: original, baseCurrency: "MVR"))
        #expect(body["name"] as? String == "Primary")
        #expect(body["bank"] == nil)
        #expect(body["opening_amount"] == nil)

        var cleared = original
        cleared.bank = " "
        cleared.number = ""
        let nulls = try json(cleared.patchRequest(from: original, baseCurrency: "MVR"))
        #expect(nulls["bank"] is NSNull)
        #expect(nulls["account_number"] is NSNull)
        #expect(nulls["name"] == nil)
    }

    @Test func clearingTheCardDaysClearsBothAsNull() throws {
        let original = AccountDraft(editing: try account(group: "card", statement: 5, due: 25))
        var cleared = original
        cleared.statementDay = nil
        cleared.dueDay = nil
        let body = try json(cleared.patchRequest(from: original, baseCurrency: "MVR"))
        #expect(body["statement_day"] is NSNull)
        #expect(body["due_day"] is NSNull)
    }

    @Test func groupsKnowWhatTheyAre() {
        #expect(AccountGroup.card.isLiability)
        #expect(AccountGroup.card.hasCreditLimit)
        #expect(!AccountGroup.savings.isLiability)
        #expect(AccountGroup.cash.isSpendableByDefault)
        #expect(!AccountGroup.savings.isSpendableByDefault)
        #expect(PaymentMethod.suggested(for: .card) == .creditCard)
    }

    @Test func spendableFollowsTheGroupUntilTouched() {
        var draft = AccountDraft()
        #expect(draft.spendsFromThis)
        #expect(draft.spendable == nil)

        draft.spendsFromThis = false
        #expect(draft.spendable == false)

        draft.group = .savings
        #expect(!draft.spendsFromThis)

        draft.spendsFromThis = false
        #expect(draft.spendable == nil)

        draft.spendsFromThis = true
        #expect(draft.spendable == true)

        draft.group = .accounts
        draft.spendsFromThis = true
        #expect(draft.spendable == nil)
    }

    @Test func adjustingToABalanceOrByAnAmountPreviewsTheResult() {
        var draft = AdjustBalanceDraft()
        #expect(draft.problem != nil)
        draft.value = 500
        #expect(draft.problem == nil)
        #expect(draft.preview(from: 120) == 500)
        draft.mode = .change
        #expect(draft.preview(from: 120) == 620)
        draft.value = -20
        #expect(draft.preview(from: 120) == 100)
    }

    @Test func theAdjustRequestSendsExactlyOneOfTheTwoAmounts() throws {
        var draft = AdjustBalanceDraft()
        draft.value = 500
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        func body() throws -> [String: Any] {
            try #require(try JSONSerialization.jsonObject(with: try encoder.encode(draft.request())) as? [String: Any])
        }
        #expect(try body()["new_balance"] as? String == "500")
        #expect(try body()["amount"] == nil)
        draft.mode = .change
        #expect(try body()["amount"] as? String == "500")
        #expect(try body()["new_balance"] == nil)
    }

    @Test func theMarketRateDecodes() throws {
        let market = try Api.decoder.decode(MarketRate.self, from: Data(#"""
        {"base":"USD","quote":"MVR","rate":"15.42000000","rate_date":"2026-11-11","requested_date":"2026-11-12","exact":false,"source":"Frankfurter"}
        """#.utf8))
        #expect(market.rate == "15.42000000")
        #expect(market.rateDate == "2026-11-11")
        #expect(!market.exact)
        #expect(market.source == "Frankfurter")
    }

    @Test func aSignIsOnlyKeptWhenAllowedAndAtTheStart() {
        #expect(DecimalInput.sanitized("-12.5", separator: ".", allowsSign: true) == "-12.5")
        #expect(DecimalInput.sanitized("-12.5", separator: ".") == "12.5")
        #expect(DecimalInput.sanitized("1-2", separator: ".", allowsSign: true) == "12")
    }
}

import Foundation
import Testing
@testable import Maalu

struct CardTests {
    private func account(_ id: String, group: String) throws -> Account {
        try Api.decoder.decode(Account.self, from: Data(#"""
        {"id":"\#(id)","name":"\#(id)","group":"\#(group)","currency":"MVR","balance":"100","base_balance":"100","opening_amount":"0",
         "exchange_rate":"1","auto_rate":false,"bank":null,"account_number":null,"description":null,
         "credit_limit":null,"statement_day":null,"due_day":null,
         "exclude_from_stats":false,"spendable":null,"archived_at":null,"transaction_count":0}
        """#.utf8))
    }

    private func card(repay: String?) throws -> Card {
        let repayJSON = repay.map { #"{"id":"\#($0)","name":"BML Current","currency":"MVR"}"# } ?? "null"
        return try Api.decoder.decode(Card.self, from: Data(#"""
        {"id":"c","name":"Visa","last_digits":"2815","kind":"credit","account":{"id":"visa","name":"Visa","currency":"MVR"},
         "repay_account":\#(repayJSON),"created_at":"2026-11-01T10:00:00Z"}
        """#.utf8))
    }

    private func json(_ request: CardRequest) throws -> [String: Any] {
        try #require(try JSONSerialization.jsonObject(with: try JSONEncoder().encode(request)) as? [String: Any])
    }

    @Test func theAccountDecidesTheKindOfCard() {
        #expect(CardKind.forAccount(in: .accounts) == .debit)
        #expect(CardKind.forAccount(in: .savings) == .debit)
        #expect(CardKind.forAccount(in: .card) == .credit)
        #expect(CardKind.forAccount(in: .loan) == nil)
        #expect(CardKind.forAccount(in: .overdrafts) == nil)
    }

    @MainActor @Test func aNewCardNeedsANameAndAtMostFourDigits() throws {
        let bank = try account("bml", group: "accounts")
        let model = CardFormModel(account: bank, kind: .debit, accounts: [bank, try account("loan", group: "loan")])
        #expect(model.problem != nil)
        model.name = " BML Debit "
        model.lastDigits = "28"
        #expect(model.problem != nil)
        model.lastDigits = "2815"
        #expect(model.problem == nil)
        #expect(model.repayChoices.map(\.id) == ["bml"])
        let body = try json(model.request)
        #expect(body["name"] as? String == "BML Debit")
        #expect(body["kind"] as? String == "debit")
        #expect(body["account_id"] as? String == "bml")
        #expect(body["repay_account_id"] is NSNull)
    }

    @MainActor @Test func anEditCanClearTheDigitsAndTheRepaymentAccount() throws {
        let visa = try account("visa", group: "card")
        let model = CardFormModel(account: visa, kind: .credit, editing: try card(repay: "bml"), accounts: [visa])
        #expect(model.repayAccountID == "bml")
        model.lastDigits = ""
        model.repayAccountID = nil
        let body = try json(model.request)
        #expect(body["last_digits"] is NSNull)
        #expect(body["repay_account_id"] is NSNull)
        #expect(body["kind"] == nil)
        #expect(body["account_id"] == nil)
    }

    @Test func repayingIsATransferFromTheRepaymentAccountIntoTheCard() throws {
        let draft = TransactionDraft(repaying: try card(repay: "bml"))
        #expect(draft.type == .transfer)
        #expect(draft.accountID == "bml")
        #expect(draft.toAccountID == "visa")
        #expect(draft.method == .bankTransfer)
    }
}

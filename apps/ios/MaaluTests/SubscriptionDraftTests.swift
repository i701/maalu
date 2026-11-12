import Foundation
import Testing
@testable import Maalu

struct SubscriptionDraftTests {
    private func accounts() throws -> [Account] {
        func json(_ id: String, _ currency: String, _ rate: String) -> String {
            #"""
            {"id":"\#(id)","name":"\#(id)","group":"accounts","currency":"\#(currency)","balance":"0","base_balance":"0",
             "opening_amount":"0","exchange_rate":"\#(rate)","auto_rate":false,"bank":null,"account_number":null,"description":null,
             "credit_limit":null,"statement_day":null,"due_day":null,"exclude_from_stats":false,"spendable":null,
             "archived_at":null,"transaction_count":0}
            """#
        }
        return try Api.decoder.decode([Account].self, from: Data("[\(json("mvr", "MVR", "1")),\(json("usd", "USD", "15.42"))]".utf8))
    }

    private func draft(_ configure: (inout SubscriptionDraft) -> Void = { _ in }) -> SubscriptionDraft {
        var draft = SubscriptionDraft()
        draft.name = "Netflix"
        draft.amount = 12
        draft.category = "Entertainment"
        configure(&draft)
        return draft
    }

    private func json(_ request: SubscriptionRequest) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(request)
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    @Test func aCompleteDraftHasNoProblem() throws {
        #expect(draft().problem(accounts: try accounts(), baseCurrency: "MVR") == nil)
    }

    @Test func nameAmountCategoryAndHowOftenAreRequired() throws {
        let accounts = try accounts()
        #expect(draft { $0.name = " " }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.amount = nil }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.amount = 0 }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.category = "" }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.count = nil }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.count = 0 }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
    }

    @Test func theNumberOfPaymentsIsOneToSixHundred() throws {
        let accounts = try accounts()
        #expect(draft { $0.installments = 12 }.problem(accounts: accounts, baseCurrency: "MVR") == nil)
        #expect(draft { $0.installments = 0 }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.installments = 601 }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
    }

    @Test func aForeignAccountNeedsARate() throws {
        let accounts = try accounts()
        #expect(draft { $0.accountID = "usd" }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.accountID = "usd"; $0.rate = 15.42 }.problem(accounts: accounts, baseCurrency: "MVR") == nil)
    }

    @Test func createSendsTheApisSpellingsAndAnExplicitNullReminder() throws {
        let body = try json(draft { $0.vendor = "Netflix Inc"; $0.remind = nil; $0.installments = 6 }
            .createRequest(accounts: try accounts(), baseCurrency: "MVR"))
        #expect(body["name"] as? String == "Netflix")
        #expect(body["amount"] as? String == "12")
        #expect(body["interval_unit"] as? String == "month")
        #expect(body["interval_count"] as? Int == 1)
        #expect(body["payment_method"] as? String == "bank_transfer")
        #expect(body["vendor_name"] as? String == "Netflix Inc")
        #expect(body["installments_total"] as? Int == 6)
        #expect(body["remind_days_before"] is NSNull)
        #expect(body["currency"] == nil)
        #expect(body["amount_varies"] == nil)
    }

    @Test func aForeignAccountSendsItsCurrencyAndRate() throws {
        let body = try json(draft { $0.accountID = "usd"; $0.rate = 15.42 }.createRequest(accounts: try accounts(), baseCurrency: "MVR"))
        #expect(body["account_id"] as? String == "usd")
        #expect(body["currency"] as? String == "USD")
        #expect(body["exchange_rate"] as? String == "15.42")
    }

    @Test func anUnchangedEditSendsNothing() throws {
        let original = draft()
        let body = try json(original.patchRequest(from: original, accounts: try accounts(), baseCurrency: "MVR"))
        #expect(body.isEmpty)
    }

    @Test func anEditSendsOnlyWhatChanged() throws {
        let original = draft()
        var edited = original
        edited.amount = 15
        edited.amountVaries = true
        let body = try json(edited.patchRequest(from: original, accounts: try accounts(), baseCurrency: "MVR"))
        #expect(Set(body.keys) == ["amount", "amount_varies"])
        #expect(body["amount"] as? String == "15")
    }

    @Test func clearingTheVendorAccountPaymentsOrReminderSendsNull() throws {
        var original = draft { $0.vendor = "Netflix Inc"; $0.accountID = "mvr"; $0.installments = 6 }
        original.remind = 3
        var edited = original
        edited.vendor = ""
        edited.accountID = nil
        edited.installments = nil
        edited.remind = nil
        let body = try json(edited.patchRequest(from: original, accounts: try accounts(), baseCurrency: "MVR"))
        #expect(body["vendor_name"] is NSNull)
        #expect(body["account_id"] is NSNull)
        #expect(body["installments_total"] is NSNull)
        #expect(body["remind_days_before"] is NSNull)
    }

    @Test func movingToAForeignAccountSendsTheCurrencyAndRate() throws {
        let original = draft()
        var edited = original
        edited.accountID = "usd"
        edited.rate = 15.42
        let body = try json(edited.patchRequest(from: original, accounts: try accounts(), baseCurrency: "MVR"))
        #expect(body["currency"] as? String == "USD")
        #expect(body["exchange_rate"] as? String == "15.42")
    }

    @Test func aCompletedPlanIsEditedAsActive() throws {
        let completed = try SubscriptionTests.subscription(["status": #""completed""#])
        #expect(SubscriptionDraft(editing: completed).status == .active)
    }
}

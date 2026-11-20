import Foundation
import Testing
@testable import Maalu

@MainActor
struct MakeSubscriptionTests {
    private func payment(type: String = "expense", vendor: String = #"{"id":"v","name":"Netflix"}"#, subscription: String = "null") throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"t","type":"\#(type)","amount":"12","to_amount":null,"currency":"USD","exchange_rate":"15","base_amount":"180","category":"Entertainment",
         "description":null,"transaction_date":"2026-11-15","transaction_time":null,"planned":false,"payment_method":"other",
         "account":null,"to_account":null,"vendor":\#(vendor),"card":null,"subscription":\#(subscription),"tags":[],
         "refund_of":null,"refunded_amount":"0","splits":[],"adjustment":false}
        """#.utf8))
    }

    @Test func onlyAPaymentNotAlreadyInASubscriptionCanBecomeOne() throws {
        #expect(try payment().canMakeSubscription)
        #expect(try !payment(subscription: #"{"id":"s","name":"Netflix"}"#).canMakeSubscription)
        #expect(try !payment(type: "income").canMakeSubscription)
    }

    @Test func theNameStartsAsTheVendorElseTheCategoryAndABlankOneIsLeftOut() throws {
        var draft = MakeSubscriptionDraft(transaction: try payment())
        #expect(draft.name == "Netflix")
        #expect(MakeSubscriptionDraft(transaction: try payment(vendor: "null")).name == "Entertainment")
        draft.name = "  "
        #expect(draft.request.name == nil)
    }

    @Test func theScheduleNeedsAnEveryFromOneTo120() throws {
        var draft = MakeSubscriptionDraft(transaction: try payment())
        #expect(draft.problem == nil)
        draft.count = nil
        #expect(draft.problem != nil)
        draft.count = 121
        #expect(draft.problem != nil)
    }

    @Test func theRequestSendsTheUnitAndCount() throws {
        var draft = MakeSubscriptionDraft(transaction: try payment())
        draft.count = 3
        draft.unit = .week
        let data = try JSONEncoder().encode(draft.request)
        let body = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(body["interval_unit"] as? String == "week")
        #expect(body["interval_count"] as? Int == 3)
    }
}

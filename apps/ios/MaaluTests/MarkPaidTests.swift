import Foundation
import Testing
@testable import Maalu

struct MarkPaidTests {
    private func planned(type: String = "expense", currency: String = "MVR", amount: String = "100", rate: String = "1") throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"p","type":"\#(type)","amount":"\#(amount)","to_amount":null,"currency":"\#(currency)","exchange_rate":"\#(rate)","base_amount":"\#(amount)",
         "category":"Bills","description":null,"transaction_date":"2026-11-15","transaction_time":null,"planned":true,"payment_method":"other",
         "account":{"id":"a","name":"BML","currency":"MVR"},"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":null,"refunded_amount":"0","splits":[],"adjustment":false}
        """#.utf8))
    }

    private func body(_ draft: MarkPaidDraft) throws -> [String: Any] {
        let encoder = JSONEncoder()
        return try #require(try JSONSerialization.jsonObject(with: try encoder.encode(draft.request())) as? [String: Any])
    }

    @Test func aPlainBillSendsItsDayAndAmountAndClearsThePlannedTime() throws {
        var draft = MarkPaidDraft(planned: try planned(), baseCurrency: "MVR")
        draft.amount = 95.5
        let sent = try body(draft)
        #expect(sent["amount"] as? String == "95.5")
        #expect(sent["transaction_time"] is NSNull)
        #expect(sent["exchange_rate"] == nil)
        #expect(sent["base_amount"] == nil)
    }

    @Test func aTransferSendsOnlyItsDay() throws {
        let draft = MarkPaidDraft(planned: try planned(type: "transfer"), baseCurrency: "MVR")
        #expect(draft.problem == nil)
        let sent = try body(draft)
        #expect(sent["amount"] == nil)
        #expect(sent["transaction_date"] as? String != nil)
    }

    @Test func theVerbFollowsTheType() throws {
        #expect(MarkPaidDraft(planned: try planned(type: "income"), baseCurrency: "MVR").verb == .received)
        #expect(MarkPaidDraft(planned: try planned(type: "transfer"), baseCurrency: "MVR").verb == .done)
        #expect(MarkPaidDraft(planned: try planned(), baseCurrency: "MVR").verb == .paid)
    }

    @Test func aForeignBillSendsAChangedRateOrWhatItCostButNotTheUnchangedRate() throws {
        var draft = MarkPaidDraft(planned: try planned(currency: "USD", amount: "10", rate: "15.4"), baseCurrency: "MVR")
        #expect(draft.isForeign)
        #expect(try body(draft)["exchange_rate"] == nil)

        draft.rate = 15.5
        #expect(try body(draft)["exchange_rate"] as? String == "15.5")

        draft.charged = 154
        let sent = try body(draft)
        #expect(sent["base_amount"] as? String == "154")
        #expect(sent["exchange_rate"] == nil)
    }

    @Test func costInBaseUsesWhatWasChargedElseTheRate() throws {
        var draft = MarkPaidDraft(planned: try planned(currency: "USD", amount: "10", rate: "15"), baseCurrency: "MVR")
        #expect(draft.costInBase == 150)
        draft.charged = 149
        #expect(draft.costInBase == 149)
        #expect(MarkPaidDraft(planned: try planned(), baseCurrency: "MVR").costInBase == nil)
    }

    @Test func anAmountAboveZeroIsRequiredAndAForeignBillNeedsARateOrACharge() throws {
        var draft = MarkPaidDraft(planned: try planned(), baseCurrency: "MVR")
        draft.amount = 0
        #expect(draft.problem != nil)
        var foreign = MarkPaidDraft(planned: try planned(currency: "USD"), baseCurrency: "MVR")
        foreign.rate = nil
        #expect(foreign.problem != nil)
        foreign.charged = 100
        #expect(foreign.problem == nil)
    }
}

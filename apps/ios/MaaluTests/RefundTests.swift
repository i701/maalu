import Foundation
import Testing
@testable import Maalu

@MainActor
struct RefundTests {
    private func transaction(type: String = "expense", amount: String = "100", refunded: String = "0", planned: Bool = false, refundOf: String = "null", splits: String = "[]", salary: Bool = false) throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"t","type":"\#(type)","amount":"\#(amount)","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"\#(amount)","category":"Food","category_is_salary":\#(salary),
         "description":null,"transaction_date":"2026-11-15","transaction_time":null,"planned":\#(planned),"payment_method":"other",
         "account":{"id":"a","name":"BML","currency":"MVR"},"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":\#(refundOf),"refunded_amount":"\#(refunded)","splits":\#(splits),"adjustment":false}
        """#.utf8))
    }

    private let twoItems = #"[{"id":"s1","name":"Rice","quantity":"1","category":"Food","amount":"60","tax_amount":null,"refunded_amount":"10","refund_of_split_id":null},{"id":"s2","name":"Oil","quantity":"1","category":"Food","amount":"40","tax_amount":null,"refunded_amount":"0","refund_of_split_id":null}]"#

    @Test func onlyAPostedPurchaseWithRoomLeftCanBeRefunded() throws {
        #expect(try transaction().isRefundable)
        #expect(try !transaction(refunded: "100").isRefundable)
        #expect(try !transaction(planned: true).isRefundable)
        #expect(try !transaction(type: "income").isRefundable)
    }

    @Test func onlyPlainNonSalaryIncomeCanBeLinked() throws {
        #expect(try transaction(type: "income").isLinkableAsRefund)
        #expect(try !transaction(type: "income", salary: true).isLinkableAsRefund)
        #expect(try !transaction(type: "income", refundOf: #"{"id":"p","amount":"50","currency":"MVR","category":"Food","transaction_date":"2026-11-01","vendor_name":null}"#).isLinkableAsRefund)
        #expect(try !transaction().isLinkableAsRefund)
    }

    @Test func aPurchaseWithoutItemsStartsAtWhatIsLeftAndCannotGoOver() throws {
        var draft = RefundDraft(purchase: try transaction(refunded: "30"))
        #expect(draft.amount == 70)
        #expect(draft.problem == nil)
        draft.amount = 71
        #expect(draft.problem != nil)
        draft.amount = 0
        #expect(draft.problem != nil)
    }

    @Test func aPurchaseWithItemsNeedsTickedItemsWithinWhatIsLeftOfEach() throws {
        var draft = RefundDraft(purchase: try transaction(splits: twoItems))
        #expect(draft.items.map(\.left) == [50, 40])
        #expect(draft.problem != nil)
        draft.items[0].isOn = true
        #expect(draft.problem == nil)
        #expect(draft.total == 50)
        draft.items[0].amount = 51
        #expect(draft.problem != nil)
    }

    @Test func aNewRefundIsIncomeThatNamesThePurchaseAndItsItems() throws {
        var draft = RefundDraft(purchase: try transaction(splits: twoItems))
        draft.items[1].isOn = true
        draft.items[1].amount = 25
        let data = try JSONEncoder().encode(draft.request(purchaseID: "p", isForeign: false))
        let body = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(body["type"] as? String == "income")
        #expect(body["refund_of_id"] as? String == "p")
        #expect(body["amount"] as? String == "25")
        #expect(body["exchange_rate"] == nil)
        let lines = try #require(body["splits"] as? [[String: Any]])
        #expect(lines.count == 1)
        #expect(lines[0]["refund_of_split_id"] as? String == "s2")
        #expect(lines[0]["category"] as? String == "Food")
    }

    @Test func changingARefundClearsABlankTimeNoteAndAccount() throws {
        let refund = try transaction(type: "income", refundOf: #"{"id":"p","amount":"50","currency":"MVR","category":"Food","transaction_date":"2026-11-01","vendor_name":null}"#)
        var draft = RefundDraft(editing: refund)
        draft.accountID = nil
        let data = try JSONEncoder().encode(draft.request(purchaseID: nil, isForeign: false))
        let body = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(body["type"] == nil)
        #expect(body["refund_of_id"] == nil)
        #expect(body["transaction_time"] is NSNull)
        #expect(body["description"] is NSNull)
        #expect(body["account_id"] is NSNull)
    }

    @Test func linkedItemsMustAddUpToTheMoneyThatCameBack() throws {
        let model = LinkRefundModel(income: try transaction(type: "income", amount: "50"))
        model.choose(try transaction(splits: twoItems))
        #expect(!model.canLink)
        model.items[0].isOn = true
        #expect(model.itemsAddUp)
        #expect(model.canLink)
        model.items[1].isOn = true
        #expect(!model.itemsAddUp)
    }
}

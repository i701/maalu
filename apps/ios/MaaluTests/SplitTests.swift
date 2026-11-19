import Foundation
import Testing
@testable import Maalu

struct SplitTests {
    private func item(_ name: String, quantity: Decimal = 1, price: Decimal, category: String = "Groceries") -> PurchaseItemDraft {
        var item = PurchaseItemDraft()
        item.name = name
        item.quantity = quantity
        item.price = price
        item.category = category
        return item
    }

    private func purchase(splits: String) throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"t","type":"expense","amount":"108","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"108",
         "category":"Groceries","description":null,"transaction_date":"2026-11-12","transaction_time":null,"planned":false,
         "payment_method":"cash","account":null,"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":null,"refunded_amount":"0","splits":\#(splits),"adjustment":false,"deleted_at":null,"group":null}
        """#.utf8))
    }

    private func json(_ request: TransactionRequest) throws -> [String: Any] {
        try #require(try JSONSerialization.jsonObject(with: try JSONEncoder().encode(request)) as? [String: Any])
    }

    @Test func gstIsTakenOutOrAddedOn() throws {
        let rice = item("Rice", quantity: 2, price: 54)
        let included = try #require(rice.line(mode: .included, rate: 8))
        #expect(included.amount == 108)
        #expect(included.tax == 8)
        let excluded = try #require(rice.line(mode: .excluded, rate: 8))
        #expect(excluded.amount == Decimal(string: "116.64"))
        #expect(excluded.tax == Decimal(string: "8.64"))
        #expect(rice.line(mode: .none, rate: nil)?.tax == nil)
        #expect(rice.line(mode: .included, rate: nil) == nil)
        #expect(item("Nothing", price: 0).line(mode: .none, rate: nil) == nil)
    }

    @Test func aSavedItemKeepsItsTotalUntilItsPriceChanges() throws {
        let saved = try #require(try purchase(splits: #"[{"id":"s","name":"Rice","quantity":"3.000","category":"Groceries","amount":"10.0000","tax_amount":"0.7407"}]"#).splits.first)
        var item = PurchaseItemDraft(saved: saved)
        #expect(item.price == Decimal(string: "3.3333"))
        #expect(item.line(mode: .none, rate: nil)?.amount == 10)
        #expect(item.line(mode: .none, rate: nil)?.tax == Decimal(string: "0.7407"))
        item.price = 4
        #expect(item.line(mode: .none, rate: nil)?.amount == 12)
    }

    @Test func itemsSetTheAmountAndTheCategoryIsLeftToTheServer() throws {
        var draft = TransactionDraft()
        draft.isSplit = true
        draft.items = [item("Rice", quantity: 2, price: 54)]
        draft.taxMode = .included
        #expect(draft.problem(accounts: [], baseCurrency: "MVR") != nil)
        draft.taxRate = 8
        draft.items.append(item("Soap", price: 12, category: "Household"))
        #expect(draft.itemsTotal == 120)
        let body = try json(draft.request(accounts: [], baseCurrency: "MVR", editing: nil))
        #expect(body["amount"] as? String == "120")
        #expect(body["category"] == nil)
        let splits = try #require(body["splits"] as? [[String: Any]])
        #expect(splits.map { $0["name"] as? String } == ["Rice", "Soap"])
        #expect(splits[0]["quantity"] as? String == "2")
        #expect(splits[0]["tax_amount"] as? String == "8")

        draft.items[1].name = " "
        #expect(draft.problem(accounts: [], baseCurrency: "MVR") != nil)
        draft.type = .transfer
        #expect(!draft.hasItems)
    }

    @Test func anEditReadsTheItemsAndTurningThemOffRemovesThem() throws {
        let original = try purchase(splits: #"""
        [{"id":"a","name":"Rice","quantity":"2","category":"Groceries","amount":"108","tax_amount":"8"},
         {"id":"b","name":"Bag","quantity":"1","category":"Groceries","amount":"5","tax_amount":null}]
        """#)
        #expect(original.canEdit)
        var draft = TransactionDraft(editing: original)
        #expect(draft.isSplit && draft.items.count == 2)
        #expect(draft.taxMode == .included && draft.taxRate == 8)
        #expect(draft.itemsTotal == 113)
        draft.isSplit = false
        draft.amount = 113
        let body = try json(draft.request(accounts: [], baseCurrency: "MVR", editing: original))
        #expect(body["splits"] is NSNull)
        #expect(body["category"] as? String == "Groceries")
    }
}

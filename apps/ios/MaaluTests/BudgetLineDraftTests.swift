import Foundation
import Testing
@testable import Maalu

struct BudgetLineDraftTests {
    private func line(rollover: Bool = false, warnPercent: Int? = nil) throws -> BudgetLine {
        try Api.decoder.decode(BudgetLine.self, from: Data(#"""
        {"id":"l","name":"Food","activity":"0","amount":"600.0000","available":"600","carried":"0","moved_in":"0","moved_out":"0",
         "rollover":\#(rollover),"warn_percent":\#(warnPercent.map(String.init) ?? "null"),"percent":0,"status":"ok","kind":null,"runs_from":null,"runs_until":null,
         "categories":[{"id":"c1","name":"Groceries"},{"id":"c2","name":"Dining"}]}
        """#.utf8))
    }

    private func json<T: Encodable>(_ value: T) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return try #require(try JSONSerialization.jsonObject(with: try encoder.encode(value)) as? [String: Any])
    }

    @Test func aNewDraftNeedsANameAnAmountAndACategory() {
        var draft = BudgetLineDraft()
        #expect(draft.problem != nil)
        draft.name = "Food"
        #expect(draft.problem != nil)
        draft.amount = 0
        #expect(draft.problem != nil)
        draft.amount = 600
        #expect(draft.problem != nil)
        draft.categoryIDs = ["c1"]
        #expect(draft.problem == nil)
        draft.name = "   "
        #expect(draft.problem != nil)
    }

    @Test func aCreateRequestSendsTheApisFields() throws {
        var draft = BudgetLineDraft()
        draft.name = " Food "
        draft.amount = 600
        draft.categoryIDs = ["b", "a"]
        draft.rollover = true
        let body = try json(draft.createRequest())
        #expect(body["name"] as? String == "Food")
        #expect(body["amount"] as? String == "600")
        #expect(body["category_ids"] as? [String] == ["a", "b"])
        #expect(body["rollover"] as? Bool == true)
    }

    @Test func anEditSendsOnlyWhatChanged() throws {
        let original = BudgetLineDraft(editing: try line())
        #expect(original.amount == 600)
        #expect(original.categoryIDs == ["c1", "c2"])

        var changed = original
        changed.amount = 700
        let body = try json(changed.patchRequest(from: original))
        #expect(body["amount"] as? String == "700")
        #expect(body["name"] == nil)
        #expect(body["category_ids"] == nil)
        #expect(body["rollover"] == nil)

        changed.categoryIDs = ["c1"]
        changed.rollover = true
        let more = try json(changed.patchRequest(from: original))
        #expect(more["category_ids"] as? [String] == ["c1"])
        #expect(more["rollover"] as? Bool == true)
    }

    @Test func anOwnWarningLevelIsSentAndClearingItSendsNull() throws {
        let original = BudgetLineDraft(editing: try line(warnPercent: 90))
        #expect(original.warnPercent == 90)
        #expect(try json(original.patchRequest(from: original))["warn_percent"] == nil)

        var cleared = original
        cleared.warnPercent = nil
        let body = try json(cleared.patchRequest(from: original))
        #expect(body.keys.contains("warn_percent"))
        #expect(body["warn_percent"] is NSNull)

        var draft = BudgetLineDraft()
        #expect(try json(draft.createRequest())["warn_percent"] == nil)
        draft.warnPercent = 70
        #expect(try json(draft.createRequest())["warn_percent"] as? Int == 70)
    }
}

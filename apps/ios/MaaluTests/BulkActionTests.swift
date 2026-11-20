import Foundation
import Testing
@testable import Maalu

@MainActor
struct BulkActionTests {
    @Test func aBulkResultDecodesAndExplainsWhatWasSkipped() throws {
        let json = #"{"updated":2,"skipped":[{"id":"a","reason":"A transfer has no category"},{"id":"b","reason":"A transfer has no category"},{"id":"c","reason":"Not found"}]}"#
        let result = try Api.decoder.decode(BulkResult.self, from: Data(json.utf8))
        #expect(result.updated == 2)
        #expect(result.message { "Updated \($0)" } == "Updated 2. 3 skipped: A transfer has no category; Not found")
        #expect(BulkResult(updated: 1, skipped: []).message { "Updated \($0)" } == "Updated 1")
    }

    @Test func severalResultsMergeIntoOne() {
        let merged = BulkResult.merged([BulkResult(updated: 500, skipped: []), BulkResult(updated: 3, skipped: [.init(id: "x", reason: "r")])])
        #expect(merged.updated == 503)
        #expect(merged.skipped.count == 1)
    }

    @Test func idsGoInBatchesOfAtMost500() {
        let ids = (1...1203).map(String.init)
        let batches = TransactionSelection.batches(of: ids)
        #expect(batches.map(\.count) == [500, 500, 203])
        #expect(batches.flatMap { $0 } == ids)
        #expect(TransactionSelection.batches(of: []).isEmpty)
    }

    @Test func tickingTogglesARowAndLeavingForgetsThem() {
        let selection = TransactionSelection()
        selection.start()
        selection.toggle("a")
        selection.toggle("b")
        selection.toggle("a")
        #expect(selection.ids == ["b"])
        #expect(selection.count == 1)
        selection.clearPicks()
        #expect(selection.isSelecting && selection.ids.isEmpty)
        selection.toggle("c")
        selection.finish()
        #expect(!selection.isSelecting && selection.ids.isEmpty)
    }

    @Test func aBulkEditSendsOnlyWhatWasSet() throws {
        var edit = BulkEdit()
        #expect(edit.isEmpty)
        edit.category = " Food "
        edit.method = .cash
        edit.addTags = ["Trip"]
        #expect(!edit.isEmpty)
        let data = try JSONEncoder().encode(edit.request(ids: ["1", "2"]))
        let body = try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
        #expect(body["ids"] as? [String] == ["1", "2"])
        #expect(body["category"] as? String == "Food")
        #expect(body["payment_method"] as? String == "cash")
        #expect(body["add_tags"] as? [String] == ["Trip"])
        #expect(body["vendor_name"] == nil)
        #expect(body["remove_tags"] == nil)
    }

    @Test func counts() {
        #expect(TransactionSelection.transactionCount(1) == "1 transaction")
        #expect(TransactionSelection.transactionCount(3) == "3 transactions")
    }
}

import Foundation
import Testing
@testable import Maalu

struct GroupTests {
    private func transaction(_ id: String, type: String = "expense", group: String? = nil) throws -> Transaction {
        let groupJSON = group.map { #"{"id":"\#($0)","name":"Trip"}"# } ?? "null"
        return try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"\#(id)","type":"\#(type)","amount":"10","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"10",
         "category":"Food","description":null,"transaction_date":"2026-11-12","transaction_time":null,"planned":false,
         "payment_method":"cash","account":null,"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":null,"refunded_amount":"0","splits":[],"adjustment":false,"deleted_at":null,"group":\#(groupJSON)}
        """#.utf8))
    }

    @Test func transfersAndMembersOfAnotherGroupCannotBeChosen() throws {
        #expect(TransactionPickerModel.refusal(of: try transaction("a"), addingTo: nil) == nil)
        #expect(TransactionPickerModel.refusal(of: try transaction("b", type: "transfer"), addingTo: nil) != nil)
        #expect(TransactionPickerModel.refusal(of: try transaction("c", group: "g1"), addingTo: nil) != nil)
        #expect(TransactionPickerModel.refusal(of: try transaction("d", group: "g1"), addingTo: "g1") != nil)
        #expect(try transaction("e", group: "g1").group?.name == "Trip")
    }

    @MainActor @Test func aNewGroupNeedsANameAndTwoTransactions() throws {
        let model = GroupFormModel()
        #expect(model.problem != nil)
        model.name = " Trip "
        model.selection = ["b"]
        #expect(model.problem != nil)
        model.selection = ["b", "a"]
        #expect(model.problem == nil)
        let body = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(model.request)) as? [String: Any])
        #expect(body["name"] as? String == "Trip")
        #expect(body["note"] is NSNull)
        #expect(body["transaction_ids"] as? [String] == ["a", "b"])
    }

    @MainActor @Test func anEditSendsTheNameAndNoteButNotTheMembers() throws {
        let detail = try Api.decoder.decode(GroupDetail.self, from: Data(#"""
        {"id":"g","name":"Trip","note":"Bangkok","created_at":"2026-11-01T10:00:00Z","transaction_count":2,
         "date_from":"2026-11-03","date_to":"2026-11-19","money_in":"0","money_out":"1200","net":"-1200","currency":"MVR","transactions":[]}
        """#.utf8))
        let model = GroupFormModel(editing: detail.summary)
        #expect(model.problem == nil)
        model.note = ""
        let body = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(model.request)) as? [String: Any])
        #expect(body["note"] is NSNull)
        #expect(body["transaction_ids"] == nil)
        #expect(GroupText.dates(from: "2026-11-03", to: "2026-11-03") != nil)
        #expect(GroupText.dates(from: nil, to: nil) == nil)
    }
}

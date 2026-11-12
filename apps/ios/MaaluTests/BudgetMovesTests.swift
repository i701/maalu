import Foundation
import Testing
@testable import Maalu

struct BudgetMovesTests {
    private func move(id: String = "m", from: String? = "a", to: String = "b", amount: String = "600", period: String? = nil, undone: String? = nil) throws -> BudgetMove {
        let fromJSON = from.map { #"{"id":"\#($0)","name":"From \#($0)"}"# } ?? "null"
        let periodJSON = period.map { #""period_start":"\#($0)","period_end":"2026-11-30","#  } ?? ""
        let undoneJSON = undone.map { "\"\($0)\"" } ?? "null"
        return try Api.decoder.decode(BudgetMove.self, from: Data(#"""
        {"id":"\#(id)","amount":"\#(amount)","note":"for guests","created_at":"2026-11-06T11:58:00Z",
         "from_line":\#(fromJSON),"to_line":{"id":"\#(to)","name":"To \#(to)"},\#(periodJSON)"undone_at":\#(undoneJSON)}
        """#.utf8))
    }

    private func budget(available: [String: String]) throws -> Budget {
        let lines = available.sorted { $0.key < $1.key }.map { id, left in
            #"""
            {"id":"\#(id)","name":"Limit \#(id)","activity":"0","amount":"100","available":"\#(left)","carried":"0","moved_in":"0",
             "moved_out":"0","rollover":false,"percent":0,"status":"ok","kind":null,"runs_from":null,"runs_until":null,"categories":[]}
            """#
        }
        return try Api.decoder.decode(Budget.self, from: Data(#"""
        {"currency":"MVR","attention":0,"moves":[],"period":{"start":"2026-11-01","end":"2026-11-30","is_current":true},
         "totals":{"activity":"0","amount":"100","available":"100","percent":0,"status":"ok"},
         "lines":[\#(lines.joined(separator: ","))],"fixed_lines":[]}
        """#.utf8))
    }

    @Test func aMoveIsDescribedFromEachLimitsSide() throws {
        let moved = try move(from: "a", to: "b")
        #expect(MoveText.describe(moved, from: "b", currency: "MVR")?.contains("from From a") == true)
        #expect(MoveText.describe(moved, from: "a", currency: "MVR")?.contains("to To b") == true)
        #expect(MoveText.describe(moved, from: "c", currency: "MVR") == nil)
        #expect(MoveText.describe(try move(from: nil, to: "b"), from: "b", currency: "MVR")?.contains("added") == true)
    }

    @Test func sourcesAreTheOtherLimitsMostLeftFirstWithEmptyOnesUnusable() throws {
        let sources = MoveSource.sources(in: try budget(available: ["a": "50", "b": "300", "c": "0", "d": "-20"]), for: "a")
        #expect(sources.map(\.id) == ["b", "c", "d"])
        #expect(sources.map(\.isUsable) == [true, false, false])
    }

    @Test func anAmountMustBePositiveAndWithinWhatTheSourceHasLeft() {
        var draft = MoveMoneyDraft()
        #expect(draft.problem(left: nil) != nil)
        draft.amount = 0
        #expect(draft.problem(left: nil) != nil)
        draft.amount = 500
        #expect(draft.problem(left: nil) == nil)
        #expect(draft.problem(left: 300) != nil)
        #expect(draft.problem(left: 500) == nil)
    }

    @Test func theRequestNamesBothLimitsAndLeavesAnEmptyNoteOut() throws {
        var draft = MoveMoneyDraft()
        draft.sourceID = "a"
        draft.amount = 250
        let request = draft.request(to: "b", on: Date(timeIntervalSince1970: 1_793_000_000))
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let body = try #require(try JSONSerialization.jsonObject(with: try encoder.encode(request)) as? [String: Any])
        #expect(body["to_line_id"] as? String == "b")
        #expect(body["from_line_id"] as? String == "a")
        #expect(body["amount"] as? String == "250")
        #expect(body["note"] == nil)
        #expect(body["on"] as? String != nil)

        draft.sourceID = nil
        draft.note = " for guests "
        let topUp = draft.request(to: "b", on: .now)
        #expect(topUp.fromLineId == nil)
        #expect(topUp.note == "for guests")
    }

    @Test func historyGroupsByPeriodNewestFirstAndKeepsOrderInside() throws {
        let periods = MoveText.byPeriod([
            try move(id: "1", period: "2026-11-01"),
            try move(id: "2", period: "2026-10-01"),
            try move(id: "3", period: "2026-11-01"),
        ])
        #expect(periods.map(\.start) == ["2026-11-01", "2026-10-01"])
        #expect(periods[0].moves.map(\.id) == ["1", "3"])
    }

    @Test func anUndoneMoveKeepsItsStampAndIsMarked() throws {
        let undone = try move(undone: "2026-11-07T09:00:00Z")
        #expect(undone.undoneAt != nil)
        #expect(try move().undoneAt == nil)
    }
}

import Foundation
import Testing
@testable import Maalu

struct SalarySplitTests {
    private let planJSON = #"""
    {"salary_id":"s","title":"Salary","salary_date":"2026-11-01","amount":"10000.0000","currency":"MVR","account_id":"a","account_name":"BML",
     "applied":true,"complete":false,"total":"3000.0000","left":"5000.0000","over":false,
     "made":[{"kind":"transfer","id":"m","target_name":"Savings","amount":"2000.0000"}],
     "items":[
      {"rule_id":"r1","target_type":"account","target_id":"x","target_name":"Savings","amount":"2000.0000","mode":"percent","value":"20","ok":true,"reason":null,"auto":true,"done":true},
      {"rule_id":"r2","target_type":"goal","target_id":"g","target_name":"Trip","amount":"3000.0000","mode":"fixed","value":"3000","ok":true,"reason":null,"auto":false,"done":false},
      {"rule_id":"r3","target_type":"account","target_id":"y","target_name":"USD","amount":"0","mode":"fixed","value":"5","ok":false,"reason":"Another currency","auto":false,"done":false}]}
    """#

    private func plan() throws -> SalarySplitPlan {
        try Api.decoder.decode(SalarySplitPlan.self, from: Data(planJSON.utf8))
    }

    @Test func onlyTheLinesLeftToMakeStartTicked() throws {
        let lines = SalarySplitLine.lines(of: try plan())
        #expect(lines.map(\.isOn) == [false, true, false])
        #expect(lines[0].reason != nil)
        #expect(lines[2].reason == "Another currency")
        #expect(try plan().waiting.map(\.ruleId) == ["r2"])
        #expect(try plan().madeTotal == 2000)
    }

    @Test func totalsAreExactAndCountWhatWasAlreadyMade() throws {
        var lines = SalarySplitLine.lines(of: try plan())
        var totals = SalarySplitTotals(lines: lines, salary: 10000, made: 2000)
        #expect(totals.total == 3000)
        #expect(totals.left == 5000)
        #expect(!totals.isOver)
        lines[1].amount = 8001
        totals = SalarySplitTotals(lines: lines, salary: 10000, made: 2000)
        #expect(totals.isOver)
        lines[1].amount = Decimal(string: "0.00001")
        #expect(SalarySplitTotals(lines: lines, salary: 10000).isInvalid)
        lines[1].amount = nil
        #expect(SalarySplitTotals(lines: lines, salary: 10000).isInvalid)
    }

    @Test func theRequestSendsOnlyTheTickedLines() throws {
        let lines = SalarySplitLine.lines(of: try plan())
        let body = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(SalarySplitRequest(lines: lines))) as? [String: Any])
        let items = try #require(body["items"] as? [[String: Any]])
        #expect(items.count == 1)
        #expect(items[0]["target_type"] as? String == "goal")
        #expect(items[0]["target_id"] as? String == "g")
        #expect(items[0]["amount"] as? String == "3000")
    }

    @Test func theResultSaysWhatWasMade() {
        #expect(SalarySplitResult(transfers: 0, entries: 0).message == "Nothing was made.")
        #expect(SalarySplitResult(transfers: 1, entries: 0).message.hasPrefix("Moved to 1 account"))
    }

    @Test func aWaitingTaskDecodes() throws {
        let json = #"{"id":"t","created_at":"2026-11-01T00:00:00Z","plan":\#(planJSON)}"#
        let task = try Api.decoder.decode(SalarySplitTask.self, from: Data(json.utf8))
        #expect(task.plan.waiting.count == 1)
        #expect(task.plan.blocked.count == 1)
    }
}

import Foundation
import Testing
@testable import Maalu

struct SalaryRuleTests {
    private func rule(_ mode: String, _ value: String, auto: Bool = false, goal: Bool = false) throws -> SalaryRule {
        let target = goal ? #""goal_id":"g","account_id":null"# : #""account_id":"a","goal_id":null"#
        return try Api.decoder.decode(SalaryRule.self, from: Data(#"{"id":"r","target_type":"\#(goal ? "goal" : "account")",\#(target),"target_name":"Savings","mode":"\#(mode)","value":"\#(value)","auto":\#(auto),"created_at":"2026-01-01T00:00:00Z"}"#.utf8))
    }

    @Test func aRuleReadsAsAShareOrAFixedAmount() throws {
        #expect(SalaryRuleText.text(try rule("percent", "10.0000"), currency: "MVR") == "10% of each salary")
        #expect(SalaryRuleText.text(try rule("fixed", "1500"), currency: "MVR").hasSuffix("each time"))
    }

    @Test func theSummaryAddsSharesAndListsFixedAmounts() throws {
        let rules = [try rule("percent", "10"), try rule("percent", "25.5"), try rule("fixed", "500")]
        let summary = SalaryRuleText.summary(rules, currency: "MVR")
        #expect(summary.hasPrefix("35.5% of the salary + "))
        #expect(SalaryRuleText.summary([], currency: "MVR") == "")
    }

    @Test func aNewRuleNeedsATargetAndAShareIsAtMost100() {
        var draft = SalaryRuleDraft()
        draft.value = 10
        #expect(draft.problem != nil)
        draft.targetID = "a"
        #expect(draft.problem == nil)
        draft.value = 101
        #expect(draft.problem != nil)
        draft.mode = .fixed
        #expect(draft.problem == nil)
        draft.value = 0
        #expect(draft.problem != nil)
    }

    @Test func aNewRuleNamesItsTargetAndAChangeDoesNot() throws {
        var draft = SalaryRuleDraft()
        draft.target = .goal
        draft.targetID = "g"
        draft.value = 20
        var body = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(draft.request)) as? [String: Any])
        #expect(body["goal_id"] as? String == "g")
        #expect(body["account_id"] == nil)
        #expect(body["mode"] as? String == "percent")
        let change = SalaryRuleDraft(editing: try rule("fixed", "300", auto: true))
        body = try #require(try JSONSerialization.jsonObject(with: JSONEncoder().encode(change.request)) as? [String: Any])
        #expect(body["goal_id"] == nil)
        #expect(body["account_id"] == nil)
        #expect(body["auto"] as? Bool == true)
    }
}

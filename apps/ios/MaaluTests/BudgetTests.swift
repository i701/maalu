import Foundation
import Testing
@testable import Maalu

struct BudgetTests {
    private func line(_ id: String, name: String = "Food", activity: String = "500", amount: String = "600", available: String = "100",
                      carried: String = "0", movedIn: String = "0", movedOut: String = "0", kind: String? = nil, status: String = "ok") -> String {
        let kindJSON = kind.map { "\"\($0)\"" } ?? "null"
        return #"""
        {"id":"\#(id)","name":"\#(name)","activity":"\#(activity)","amount":"\#(amount)","available":"\#(available)",
         "carried":"\#(carried)","moved_in":"\#(movedIn)","moved_out":"\#(movedOut)","rollover":false,"percent":83,
         "status":"\#(status)","kind":\#(kindJSON),"runs_from":null,"runs_until":null,"categories":[{"id":"c","name":"Groceries"}]}
        """#
    }

    private func fixed(_ id: String, start: String, end: String, state: String) -> String {
        #"""
        {"id":"\#(id)","name":"Trip","activity":"0","amount":"900","available":"900","percent":0,"status":"ok","state":"\#(state)",
         "start_date":"\#(start)","end_date":"\#(end)","days_left":null,"kind":null,"categories":[]}
        """#
    }

    private func budget(lines: [String], fixed: [String] = [], period: (String, String) = ("2026-11-01", "2026-11-30")) throws -> Budget {
        try Api.decoder.decode(Budget.self, from: Data(#"""
        {"currency":"MVR","attention":1,"period":{"start":"\#(period.0)","end":"\#(period.1)","is_current":true},
         "totals":{"activity":"700","amount":"1000","available":"300","percent":70,"status":"ok"},
         "lines":[\#(lines.joined(separator: ","))],"fixed_lines":[\#(fixed.joined(separator: ","))]}
        """#.utf8))
    }

    @Test func aLineAllowsItsAmountPlusCarriedAndMovedInLessMovedOut() throws {
        let result = try budget(lines: [line("a", amount: "600", carried: "50", movedIn: "100", movedOut: "30")])
        #expect(result.lines[0].allowed == 720)
    }

    @Test func fixedLinesShowOnlyWhereTheirDaysTouchThePeriod() throws {
        let result = try budget(lines: [], fixed: [
            fixed("in", start: "2026-11-10", end: "2026-12-10", state: "active"),
            fixed("later", start: "2026-12-01", end: "2026-12-31", state: "upcoming"),
            fixed("earlier", start: "2026-09-01", end: "2026-10-31", state: "ended"),
        ])
        #expect(result.fixedLinesInPeriod.map(\.id) == ["in"])
        #expect(result.runningFixedLines.map(\.id) == ["in"])
        #expect(!result.isEmpty)
    }

    @Test func kindTotalsAreEmptyUntilALimitHasAKind() throws {
        #expect(BudgetKindTotal.totals(of: try budget(lines: [line("a"), line("b")]).lines).isEmpty)

        let sorted = try budget(lines: [
            line("a", activity: "100", amount: "400", kind: "need"),
            line("b", activity: "50", amount: "200", kind: "need"),
            line("c", activity: "20", amount: "100", kind: "want"),
            line("d", activity: "5", amount: "50"),
        ]).lines
        let totals = BudgetKindTotal.totals(of: sorted)
        #expect(totals.map(\.id) == ["need", "want", "other"])
        #expect(totals[0].spent == 150)
        #expect(totals[0].limit == 600)
        #expect(totals[2].limit == 50)
    }

    @Test func leftTextSaysOverByForANegativeAvailable() {
        #expect(BudgetText.left("250", currency: "MVR").contains("left"))
        let over = BudgetText.left("-250", currency: "MVR")
        #expect(over.contains("Over by"))
        #expect(!over.contains("-"))
    }

    @Test func aGoalNeedSentenceFollowsItsTargetDate() throws {
        func goal(date: String?, months: Int?) throws -> Goal {
            let dateJSON = date.map { "\"\($0)\"" } ?? "null"
            let monthsJSON = months.map(String.init) ?? "null"
            return try Api.decoder.decode(Goal.self, from: Data(#"""
            {"id":"g","name":"Trip","currency":"MVR","saved":"100","target_amount":"1000","remaining":"900","percent":10,
             "reached":false,"account":null,"monthly_amount":null,"target_date":\#(dateJSON),"months_left":\#(monthsJSON),
             "needed_per_month":"300","period_status":null,"period_planned":null,"period_contributed":null}
            """#.utf8))
        }
        func text(_ goal: Goal) -> String? {
            BudgetText.need(of: goal).map { String($0.characters) }
        }
        #expect(text(try goal(date: nil, months: nil)) == nil)
        let planned = text(try goal(date: "2027-02-01", months: 3)) ?? ""
        #expect(planned.contains("300"))
        #expect(planned.contains("3 more months"))
        #expect(!planned.contains("inflect"))
        #expect(text(try goal(date: "2027-02-01", months: 1))?.contains("1 more month") == true)
        #expect(text(try goal(date: "2026-10-01", months: 0))?.contains("passed") == true)
    }

    @Test func statusWordsMatchTheWebs() {
        #expect(String(localized: BudgetStatus.title("ok")) == "On track")
        #expect(String(localized: BudgetStatus.title("warning")) == "Close to limit")
        #expect(String(localized: BudgetStatus.title("over")) == "Over the limit")
    }
}

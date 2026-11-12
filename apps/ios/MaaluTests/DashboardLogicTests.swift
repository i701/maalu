import Foundation
import Testing
@testable import Maalu

struct DashboardLogicTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        return calendar
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) ?? .now
    }

    private func category(_ name: String, _ total: String, type: String = "expense", kind: String? = nil) -> CategoryTotal {
        CategoryTotal(categoryId: name, category: name, color: "blue", total: total, type: type, kind: kind)
    }

    @Test func spendingFoldsTheTailIntoOther() {
        let categories = (1...8).map { category("C\($0)", String($0 * 10)) } + [category("Salary", "999", type: "income")]
        let rows = SpendingRow.rows(from: categories, top: 6)
        #expect(rows.count == 7)
        #expect(rows.first?.name == "C8")
        #expect(rows.last?.name == "Other")
        #expect(rows.last?.total == 30)
        #expect(abs(rows.map(\.share).reduce(0, +) - 1) < 0.000_001)
    }

    @Test func spendingIsEmptyWhenNothingWasSpent() {
        #expect(SpendingRow.rows(from: []).isEmpty)
        #expect(SpendingRow.rows(from: [category("Salary", "10", type: "income")]).isEmpty)
    }

    @Test func kindsSplitSpendingAndIgnoreIncome() throws {
        let shares = try #require(KindShare.shares(from: [
            category("Rent", "600", kind: "need"),
            category("Cinema", "200", kind: "want"),
            category("Misc", "200"),
            category("Pay", "5000", type: "income", kind: "need"),
        ]))
        #expect(shares.map(\.kind) == [.need, .want, .unsorted])
        #expect(shares.map(\.share) == [0.6, 0.2, 0.2])
        #expect(KindShare.shares(from: []) == nil)
    }

    @Test func creditUsageIsWhatIsOwedAgainstTheLimit() throws {
        let usage = try #require(CreditUsage(balance: "-850", limit: "1000"))
        #expect(usage.owed == 850)
        #expect(usage.percent == 85)
        #expect(usage.isHigh)
        #expect(try #require(CreditUsage(balance: "120", limit: "1000")).owed == 0)
        #expect(CreditUsage(balance: "-5", limit: nil) == nil)
        #expect(CreditUsage(balance: "-5", limit: "0") == nil)
    }

    @Test func percentChangeNeedsSomethingToCompareWith() throws {
        #expect(PercentChange.between(150, 100) == 50)
        #expect(PercentChange.between(50, 100) == -50)
        #expect(PercentChange.between(10, 0) == nil)
    }

    @Test func aMonthRunsFromItsFirstToItsLastDay() {
        let november = MonthRange(containing: date(2026, 11, 12), calendar: calendar)
        #expect(calendar.component(.day, from: november.start) == 1)
        #expect(calendar.component(.day, from: november.end) == 30)

        let december = november.shifted(by: 1, calendar: calendar)
        #expect(calendar.component(.month, from: december.start) == 12)
        let october = november.shifted(by: -1, calendar: calendar)
        #expect(calendar.component(.day, from: october.end) == 31)
    }

    @Test func theCurrentMonthIsRecognisedAndItsTrendStopsToday() {
        let now = date(2026, 11, 12)
        let november = MonthRange(containing: now, calendar: calendar)
        #expect(november.isCurrent(now: now, calendar: calendar))
        #expect(!november.shifted(by: -1, calendar: calendar).isCurrent(now: now, calendar: calendar))
        #expect(november.trendEnd(now: now) == now)
        let october = november.shifted(by: -1, calendar: calendar)
        #expect(october.trendEnd(now: now) == october.end)
    }

    @Test func budgetAndGoalsDecode() throws {
        let budget = try Api.decoder.decode(Budget.self, from: Data(#"""
        {"currency":"MVR","attention":1,"totals":{"activity":"700","amount":"1000","percent":70,"status":"ok"},
         "lines":[{"id":"l","name":"Food","activity":"500","amount":"600","percent":83,"status":"warning"}],
         "fixed_lines":[{"id":"f","name":"Trip","activity":"0","amount":"900","percent":0,"status":"ok",
                         "state":"active","end_date":"2026-12-01"},
                        {"id":"g","name":"Old","activity":"0","amount":"1","percent":0,"status":"ok",
                         "state":"ended","end_date":"2026-01-01"}]}
        """#.utf8))
        #expect(budget.lines.count == 1)
        #expect(budget.runningFixedLines.map(\.name) == ["Trip"])
        #expect(!budget.isEmpty)

        let goals = try Api.decoder.decode([Goal].self, from: Data(#"""
        [{"id":"g","name":"Fund","currency":"MVR","saved":"1200","target_amount":"5000","percent":24,"reached":false}]
        """#.utf8))
        #expect(goals[0].percent == 24)
    }
}

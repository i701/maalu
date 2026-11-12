import Foundation
import Testing
@testable import Maalu

struct CompareTests {
    private let today = "2026-11-12"

    private func totals(_ rows: [(name: String, total: String, type: TransactionType, kind: String?, parent: String?)]) -> [CategoryTotal] {
        rows.map { row in
            CategoryTotal(categoryId: row.name, category: row.name, color: "blue", total: row.total, type: row.type.rawValue, kind: row.kind, parent: row.parent)
        }
    }

    @Test func presetPeriodsAreWholeMonths() throws {
        let periods = try #require(ComparePreset.periods(for: .thisMonth, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil))
        #expect(periods.now.from == "2026-11-01")
        #expect(periods.now.to == "2026-11-30")
        #expect(periods.before.from == "2026-10-01")
        #expect(periods.before.to == "2026-10-31")

        let lastMonth = try #require(ComparePreset.periods(for: .lastMonth, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil))
        #expect(lastMonth.now.from == "2026-10-01")
        #expect(lastMonth.before.from == "2026-09-01")
        #expect(lastMonth.before.to == "2026-09-30")
    }

    @Test func presetPeriodsForDaysAndYears() throws {
        let days = try #require(ComparePreset.periods(for: .last30, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil))
        #expect(days.now.from == "2026-10-14")
        #expect(days.now.to == "2026-11-12")
        #expect(days.before.from == "2026-09-14")
        #expect(days.before.to == "2026-10-13")
        #expect(days.now.label == "the last 30 days")

        let year = try #require(ComparePreset.periods(for: .thisYear, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil))
        #expect(year.now.from == "2026-01-01")
        #expect(year.now.to == "2026-11-12")
        #expect(year.before.from == "2025-01-01")
        #expect(year.before.to == "2025-11-12")
        #expect(year.now.label == "2026 so far")
        #expect(year.before.label == "the same days of 2025")
    }

    @Test func customPeriodsNeedBothCompleteRangesInOrder() {
        #expect(ComparePreset.periods(for: .custom, on: today, nowFrom: "2026-11-01", nowTo: "2026-11-12", beforeFrom: "2026-10-01", beforeTo: "2026-10-31") != nil)
        #expect(ComparePreset.periods(for: .custom, on: today, nowFrom: "2026-11-01", nowTo: nil, beforeFrom: "2026-10-01", beforeTo: "2026-10-31") == nil)
        #expect(ComparePreset.periods(for: .custom, on: today, nowFrom: "2026-11-30", nowTo: "2026-11-01", beforeFrom: "2026-10-01", beforeTo: "2026-10-31") == nil)
        #expect(ComparePreset.periods(for: .custom, on: today, nowFrom: "2026-11-01", nowTo: "2026-11-12", beforeFrom: "2026-10-31", beforeTo: "2026-10-01") == nil)
    }

    @Test func dateMathCrossesBoundaries() {
        #expect(ComparePreset.addDays("2026-01-01", -1) == "2025-12-31")
        #expect(ComparePreset.addDays("2026-03-01", 31) == "2026-04-01")
        #expect(ComparePreset.shiftMonth("2026-01-15", by: -1) == "2025-12-01")
        #expect(ComparePreset.shiftMonth("2026-01-15", by: 2) == "2026-03-01")
    }

    @Test func sameDayYearsAgoClampsFebruary() {
        #expect(ComparePreset.sameDayYearsAgo("2024-02-29", 1) == "2023-02-28")
        #expect(ComparePreset.sameDayYearsAgo("2026-11-12", 1) == "2025-11-12")
    }

    @Test func rowsLineCategoriesUpByBiggestMove() {
        let before = totals([
            ("A", "100", .expense, nil, nil),
            ("B", "50", .expense, nil, nil),
        ])
        let now = totals([
            ("A", "80", .expense, nil, nil),
            ("C", "30", .expense, nil, nil),
        ])
        let rows = CompareRow.rows(before: before, now: now, type: .expense)
        #expect(rows.map(\.categoryId) == ["B", "C", "A"])
        #expect(rows[0].state == .gone)
        #expect(rows[0].change.change == -50)
        #expect(rows[1].state == .new)
        #expect(rows[1].change.change == 30)
        #expect(rows[2].state == .both)
        #expect(rows[2].change.change == -20)
        #expect(rows[2].change.percent == -20)
    }

    @Test func rowsUseExactDecimalMath() {
        let before = totals([("A", "12.25", .expense, nil, nil)])
        let now = totals([("A", "10.10", .expense, nil, nil)])
        let rows = CompareRow.rows(before: before, now: now, type: .expense)
        #expect(rows[0].change.change == Decimal(string: "-2.15"))
    }

    @Test func totalsAddUpExactly() {
        let before = totals([
            ("Salary", "1000", .income, nil, nil),
            ("Food", "600", .expense, nil, nil),
        ])
        let now = totals([
            ("Salary", "1200", .income, nil, nil),
            ("Food", "900", .expense, nil, nil),
        ])
        let result = CompareTotals.make(before: before, now: now)
        #expect(result.income.change == 200)
        #expect(result.income.percent == 20)
        #expect(result.expense.change == 300)
        #expect(result.kept.before == 400)
        #expect(result.kept.now == 300)
        #expect(result.kept.change == -100)
    }

    @Test func percentIsNilWhenThereWasNothingToCompareWith() {
        #expect(CompareChange(before: 0, now: 50).percent == nil)
        #expect(CompareChange(before: -10, now: 50).percent == nil)
        #expect(CompareChange(before: 200, now: 250).percent == 25)
    }

    @Test func kindsSumSpendingByKindAndLeaveOutEmptyOnes() {
        let before = totals([
            ("Food", "100", .expense, "need", nil),
            ("Fun", "40", .expense, "want", nil),
        ])
        let now = totals([
            ("Food", "80", .expense, "need", nil),
            ("Books", "30", .expense, nil, nil),
        ])
        let rows = CompareKinds.rows(before: before, now: now)
        #expect(rows.map(\.category) == ["Needs", "Wants", "Not sorted"])
        #expect(rows[0].change.change == -20)
        #expect(rows[1].state == .gone)
        #expect(rows[2].state == .new)
        #expect(CompareKinds.rows(before: [], now: []).isEmpty)
    }

    @Test func theSentenceNamesOnlyWhatMovedTheSameWay() {
        let noSpending = CompareText.spendingSentence(
            expense: CompareChange(before: 0, now: 0), rows: [], against: "October 2026", currency: "MVR"
        )
        #expect(noSpending == "There is no spending in either period.")

        let same = CompareText.spendingSentence(
            expense: CompareChange(before: 100, now: 100), rows: [], against: "October 2026", currency: "MVR"
        )
        #expect(same == "Spending is the same as in October 2026.")

        let rows = CompareRow.rows(before: totals([
            ("Groceries", "50", .expense, nil, nil),
            ("Cinema", "30", .expense, nil, nil),
        ]), now: totals([
            ("Groceries", "120", .expense, nil, nil),
            ("Cinema", "10", .expense, nil, nil),
        ]), type: .expense)
        let up = CompareText.spendingSentence(
            expense: CompareChange(before: 80, now: 130), rows: rows, against: "October 2026", currency: "MVR"
        )
        #expect(up.contains("Spending is up"))
        #expect(up.contains("Groceries"))
        #expect(!up.contains("Cinema"))
        #expect(up.contains("Most of it"))

        let down = CompareText.spendingSentence(
            expense: CompareChange(before: 130, now: 80), rows: rows, against: "October 2026", currency: "MVR"
        )
        #expect(down.contains("Spending is down"))
        #expect(down.contains("Cinema"))
    }

    @Test func biggestMovesSplitByDirection() {
        let rows = CompareRow.rows(before: totals([
            ("A", "100", .expense, nil, nil),
            ("B", "100", .expense, nil, nil),
            ("C", "100", .expense, nil, nil),
        ]), now: totals([
            ("A", "150", .expense, nil, nil),
            ("B", "40", .expense, nil, nil),
            ("C", "100", .expense, nil, nil),
        ]), type: .expense)
        let moves = CompareText.biggestMoves(rows: rows)
        #expect(moves.up.map(\.categoryId) == ["A"])
        #expect(moves.down.map(\.categoryId) == ["B"])
    }
}

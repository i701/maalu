import Foundation
import Testing
@testable import Maalu

struct TransactionFilterTests {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "UTC") ?? .gmt
        return calendar
    }

    private func date(_ year: Int, _ month: Int, _ day: Int) -> Date {
        calendar.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) ?? .now
    }

    private func values(_ items: [URLQueryItem]) -> [String: String] {
        Dictionary(items.compactMap { item in item.value.map { (item.name, $0) } }, uniquingKeysWith: { first, _ in first })
    }

    @Test func anEmptyFilterSendsNothingAndIsNotActive() {
        let filter = TransactionFilter()
        #expect(filter.queryItems.isEmpty)
        #expect(!filter.isActive)
        #expect(filter.detailCount == 0)
    }

    @Test func everyFilterIsSentUnderTheApisName() {
        var filter = TransactionFilter(text: " taxi ", type: .expense)
        filter.accountID = "a1"
        filter.categoryID = "c1"
        filter.minAmount = 10
        filter.maxAmount = 99.5
        let query = values(filter.queryItems)
        #expect(query["q"] == "taxi")
        #expect(query["type"] == "expense")
        #expect(query["account_id"] == "a1")
        #expect(query["category_id"] == "c1")
        #expect(query["min_amount"] == "10")
        #expect(query["max_amount"] == "99.5")
    }

    @Test func tagsAreRepeatedWithTheirMatchMode() {
        var filter = TransactionFilter()
        filter.tagIDs = ["b", "a"]
        filter.matchesAllTags = true
        let items = filter.queryItems
        #expect(items.filter { $0.name == "tag_id" }.compactMap(\.value) == ["a", "b"])
        #expect(values(items)["tag_match"] == "all")
    }

    @Test func detailCountIgnoresTheSearchAndTheType() {
        var filter = TransactionFilter(text: "x", type: .income)
        #expect(filter.detailCount == 0)
        filter.dateFrom = .now
        filter.dateTo = .now
        filter.minAmount = 1
        filter.tagIDs = ["t"]
        #expect(filter.detailCount == 3)
        #expect(filter.clearingDetails().detailCount == 0)
        #expect(filter.clearingDetails().text == "x")
    }

    @Test func pickingADateSetsItAndAnUnsetDateShowsToday() {
        var filter = TransactionFilter()
        #expect(filter.dateFrom == nil)
        #expect(Calendar.current.isDateInToday(filter.fromDate))
        let day = date(2026, 3, 5)
        filter.fromDate = day
        filter.toDate = day
        #expect(filter.dateFrom == day)
        #expect(filter.dateTo == day)
        #expect(filter.detailCount == 1)
    }

    @Test func presetsCoverWholeMonthsAndTheYearSoFar() {
        let now = date(2026, 11, 12)
        let month = DatePreset.thisMonth.range(now: now, calendar: calendar)
        #expect(calendar.component(.day, from: month.from) == 1)
        #expect(calendar.component(.day, from: month.to) == 30)

        let last = DatePreset.lastMonth.range(now: now, calendar: calendar)
        #expect(calendar.component(.month, from: last.from) == 10)
        #expect(calendar.component(.day, from: last.to) == 31)

        let days = DatePreset.last30Days.range(now: now, calendar: calendar)
        #expect(calendar.dateComponents([.day], from: days.from, to: days.to).day == 29)

        let year = DatePreset.thisYear.range(now: now, calendar: calendar)
        #expect(calendar.component(.month, from: year.from) == 1)
        #expect(calendar.component(.day, from: year.from) == 1)
    }
}

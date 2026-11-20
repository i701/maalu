import Foundation
import Testing
@testable import Maalu

struct TrendsTests {
    private func row(_ name: String, _ amounts: [String], color: String = "blue", type: String = "expense", parent: String? = nil) -> CategoryMonthRow {
        let total = amounts.reduce(Decimal(0)) { $0 + (Money.decimal($1) ?? 0) }
        return CategoryMonthRow(categoryId: name, category: name, color: color, type: type, parent: parent, amounts: amounts, total: "\(total)")
    }

    @Test func theTableEndsWithThisMonthAndSpansTheRange() {
        let range = TrendsMath.bounds(months: 12, today: "2026-11-20")
        #expect(range.from == "2025-12-01")
        #expect(range.to == "2026-11-30")
        #expect(TrendsMath.bounds(months: 6, today: "2026-02-10").to == "2026-02-28")
    }

    @Test func columnsAreAddedExactly() {
        let rows = [row("Food", ["0.10", "5"]), row("Rent", ["0.20", "10"])]
        #expect(TrendsMath.columnTotals(rows, count: 2) == [Decimal(string: "0.30"), 15])
        #expect(TrendsMath.maxCell(rows) == 10)
    }

    @Test func aCellIsShadedByItsShareAndARefundIsNot() {
        #expect(TrendsMath.heat(5, max: 10) == 0.5)
        #expect(TrendsMath.heat(-3, max: 10) == 0)
        #expect(TrendsMath.heat(0, max: 10) == 0)
        #expect(TrendsMath.heat(5, max: 0) == 0)
    }

    @Test func aCellShowsADashForNothingAndDropsDecimalsWhenLarge() {
        #expect(TrendsMath.cellText(0) == "–")
        #expect(TrendsMath.cellText(12.5) == "12.50")
        #expect(TrendsMath.cellText(2500) == "2,500")
    }

    @Test func theBiggestCategoriesStackFirstAndTheRestFoldIntoOther() {
        let rows = (1...9).map { row("C\($0)", [String($0), "0"], color: "blue") }
        let series = TrendStack.series(rows, top: 6)
        #expect(series.count == 7)
        #expect(series.first?.name == "C9")
        #expect(series.last?.name == "Other")
        #expect(series.last?.value(at: 0) == 6)
    }

    @Test func aLoneSeventhCategoryIsNotHiddenAndRefundsCountAsZero() {
        let seven = (1...7).map { row("C\($0)", [String($0)]) }
        #expect(TrendStack.series(seven, top: 6).count == 7)
        #expect(!TrendStack.series(seven, top: 6).contains { $0.name == "Other" })
        let refunded = TrendStack.series([row("Food", ["10", "-4"])])
        #expect(refunded[0].values == [10, 0])
    }

    @Test func aRepeatedAccentGetsAFreeOne() {
        let series = [
            TrendSeries(name: "A", color: "blue", values: []),
            TrendSeries(name: "B", color: "blue", values: []),
            TrendSeries(name: "Other", color: nil, values: []),
        ]
        let accents = TrendStack.distinctAccents(series, palette: ["blue", "green", "orange"])
        #expect(accents == ["blue", "green", nil])
    }

    @Test func theAPIRowsDecode() throws {
        let json = #"{"currency":"MVR","months":["2026-10","2026-11"],"categories":[{"type":"expense","category_id":"c","category":"Food","color":"green","kind":null,"parent_id":null,"parent":null,"parent_color":null,"amounts":["1.0000","2.0000"],"total":"3.0000","count":2}]}"#
        let months = try Api.decoder.decode(CategoryMonths.self, from: Data(json.utf8))
        #expect(months.months.count == 2)
        #expect(months.categories[0].totalValue == 3)
    }
}

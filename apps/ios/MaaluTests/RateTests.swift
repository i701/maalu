import Foundation
import Testing
@testable import Maalu

struct RateTests {
    @Test func theHistorySummaryFindsTheEndsRangeAndMovement() throws {
        let points = [RatePoint(date: "2026-11-01", rate: "15.00"), RatePoint(date: "2026-11-02", rate: "14.00"), RatePoint(date: "2026-11-03", rate: "16.50")]
        let summary = try #require(RateSummary(points))
        #expect(summary.first == 15)
        #expect(summary.last == Decimal(string: "16.5"))
        #expect(summary.low == 14)
        #expect(summary.high == Decimal(string: "16.5"))
        #expect(summary.change == 10)
        #expect(RateSummary([]) == nil)
    }

    @Test func aRateKeepsFourDecimalsButNoNeedlessZeros() {
        #expect(RateSummary.text(Decimal(string: "15.4")!) == "15.4")
        #expect(RateSummary.text(Decimal(string: "0.06480")!) == "0.0648")
        #expect(RateSummary.text(Decimal(string: "15.123456")!) == "15.1235")
    }

    @Test func theHistoryDecodes() throws {
        let json = #"{"base":"USD","quote":"MVR","points":[{"date":"2026-11-01","rate":"15.4"}],"source":"Frankfurter"}"#
        let history = try Api.decoder.decode(RateHistory.self, from: Data(json.utf8))
        #expect(history.points.count == 1)
        #expect(history.source == "Frankfurter")
    }
}

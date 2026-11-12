import Foundation
import Testing
@testable import Maalu

struct DashboardModelsTests {
    private func available(_ amount: String, bills: Int = 1, reserved: Int = 0) throws -> AvailableToSpend {
        let billsJSON = (0..<bills).map {
            #"{"id":"b\#($0)","title":"Netflix","date":"2026-11-14","amount":"238.8558","overdue":false,"estimate":false}"#
        }.joined(separator: ",")
        let reservedJSON = (0..<reserved).map {
            #"{"goal_id":"g\#($0)","name":"Fund","amount":"100"}"#
        }.joined(separator: ",")
        let json = #"""
        {"currency":"MVR","period_start":"2026-11-01","period_end":"2026-11-30","today":"2026-11-12","expected":[],"available":"\#(amount)","balance":"5300.1140",
         "bills_total":"238.8558","card_payments_total":"0","reserved_total":"100",
         "accounts":[{"id":"a","name":"BML Current","group":"accounts","balance":"1742.5300"}],
         "bills":[\#(billsJSON)],"card_payments":[],"reserved":[\#(reservedJSON)]}
        """#
        return try Api.decoder.decode(AvailableToSpend.self, from: Data(json.utf8))
    }

    @Test func aPositiveFigureIsNotShort() throws {
        let value = try available("1234.5")
        #expect(!value.isShort)
        #expect(value.magnitude == Decimal(string: "1234.5"))
    }

    @Test func aNegativeFigureIsShortAndShownWithoutItsSign() throws {
        let value = try available("-330.69")
        #expect(value.isShort)
        #expect(value.magnitude == Decimal(string: "330.69"))
    }

    @Test func theSummaryNamesWhatIsSubtracted() throws {
        let plain = try available("10", bills: 0).summary
        #expect(plain.contains("1 account"))
        #expect(!plain.contains("less"))

        let full = try available("10", bills: 2, reserved: 1).summary
        #expect(full.contains("less"))
        #expect(full.contains("2 bills"))
        #expect(full.contains("set aside"))
    }

    @Test func monthlyPointsKeepIncomeLessSpending() throws {
        let stats = try Api.decoder.decode(MonthlyStats.self, from: Data(#"""
        {"currency":"MVR","months":[{"month":"2026-10","income":"10000.0000","expense":"8667.0220"},
                                    {"month":"2026-11","income":"100","expense":"250"}]}
        """#.utf8))
        #expect(stats.months[0].kept == Decimal(string: "1332.978"))
        #expect(stats.months[1].kept == Decimal(string: "-150"))
        let start = try #require(stats.months[0].start)
        #expect(Calendar.current.component(.month, from: start) == 10)
    }

    @Test func balancePointsReadTheirDayAndValue() throws {
        let trend = try Api.decoder.decode(BalanceTrend.self, from: Data(#"""
        {"currency":"MVR","points":[{"date":"2026-11-10","assets":"1","liabilities":"0","total":"18401.3440"}]}
        """#.utf8))
        #expect(trend.points[0].value == 18401.344)
        #expect(trend.points[0].day != nil)
    }
}

import Foundation
import Testing
@testable import Maalu

struct NetWorthTests {
    private func data(start: String = "1000", end: String, change: String, drivers: [(String, String)]) throws -> NetWorthDrivers {
        let list = drivers.map { #"{"key":"\#($0.0)","amount":"\#($0.1)"}"# }.joined(separator: ",")
        return try Api.decoder.decode(NetWorthDrivers.self, from: Data(#"""
        {"currency":"MVR","start_date":"2026-10-21","end_date":"2026-11-19","start":"\#(start)","end":"\#(end)","change":"\#(change)",
         "drivers":[\#(list)],
         "accounts":[{"account_id":"a","name":"BML","group":"accounts","currency":"MVR","start":"1000","end":"1200","change":"200"}]}
        """#.utf8))
    }

    private func money(_ value: Decimal) -> String { MoneyFormat.string(value, currency: "MVR") }

    @Test func driversChainFromZeroAndEndWithTheTotal() throws {
        let result = try data(end: "1200", change: "200", drivers: [("income", "500"), ("spending", "-400"), ("adjustments", "0"), ("exchange_rates", "100")])
        #expect(result.drivers.last?.key == .exchangeRates)
        #expect(result.accounts.first?.changeValue == 200)
        let bars = NetWorthBar.bars(drivers: result.drivers, change: result.changeValue)
        #expect(bars.map(\.id) == ["income", "spending", "exchange_rates", "change"])
        #expect(bars.map(\.low) == [0, 100, 100, 0])
        #expect(bars.map(\.high) == [500, 500, 200, 200])
        #expect(bars.last?.isTotal == true)
    }

    @Test func theSentenceSaysWhatMovedItMost() throws {
        let rose = try data(end: "1200", change: "200", drivers: [("income", "500"), ("spending", "-400"), ("transfers", "-50"), ("exchange_rates", "150")])
        let percent = 20.0.formatted(.number.precision(.fractionLength(1)))
        #expect(NetWorthText.sentence(rose) == "Net worth rose \(money(200)) (\(percent)%), from \(money(1000)) to \(money(1200)). You kept \(money(100)) (income less spending). Exchange rates added \(money(150)), transfers across net worth took \(money(50)).")

        let fell = try data(start: "0", end: "-300", change: "-300", drivers: [("income", "100"), ("spending", "-400")])
        #expect(NetWorthText.sentence(fell) == "Net worth fell \(money(300)), from \(money(0)) to \(money(-300)). You spent \(money(300)) more than you earned.")

        let still = try data(end: "1000", change: "0", drivers: [("income", "0")])
        #expect(NetWorthText.sentence(still) == "Net worth stayed at \(money(1000)).")
    }
}

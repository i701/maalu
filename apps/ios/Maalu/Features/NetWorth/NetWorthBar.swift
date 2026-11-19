import Foundation

/// One bar of the waterfall: a driver floating from where the one before it ended, or the total change from zero.
struct NetWorthBar: Identifiable, Equatable {
    let id: String
    let title: String
    let value: Decimal
    let low: Decimal
    let high: Decimal
    let isTotal: Bool

    /// Each driver that is not zero, chained from zero (where net worth stood at the start), then the total change.
    static func bars(drivers: [NetWorthDriver], change: Decimal) -> [NetWorthBar] {
        var running: Decimal = 0
        var bars: [NetWorthBar] = []
        for driver in drivers where driver.value != 0 {
            let next = running + driver.value
            bars.append(NetWorthBar(id: driver.key.rawValue, title: String(localized: driver.key.title), value: driver.value,
                                    low: min(running, next), high: max(running, next), isTotal: false))
            running = next
        }
        bars.append(NetWorthBar(id: "change", title: String(localized: "Total change"), value: change,
                                low: min(0, change), high: max(0, change), isTotal: true))
        return bars
    }
}

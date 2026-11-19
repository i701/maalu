import Foundation

enum NetWorthText {
    /// Two or three plain sentences, as on the web: what net worth did and which drivers moved it most. Drivers that came to nothing are not mentioned.
    static func sentence(_ data: NetWorthDrivers) -> String {
        let money = { (value: Decimal) in MoneyFormat.string(value, currency: data.currency) }
        let change = data.changeValue
        if change == 0 && data.drivers.allSatisfy({ $0.value == 0 }) {
            return String(localized: "Net worth stayed at \(money(data.endValue)).")
        }
        var parts: [String] = []
        if change == 0 {
            parts.append(String(localized: "Net worth ended where it began, at \(money(data.endValue)), but things moved underneath."))
        } else {
            let percent = PercentChange.between(data.endValue, data.startValue)
                .map { " (\(abs($0).formatted(.number.precision(.fractionLength(1))))%)" } ?? ""
            let from = money(data.startValue), to = money(data.endValue), moved = money(abs(change))
            parts.append(change > 0
                ? String(localized: "Net worth rose \(moved)\(percent), from \(from) to \(to).")
                : String(localized: "Net worth fell \(moved)\(percent), from \(from) to \(to)."))
        }
        let kept = amount(.income, in: data) + amount(.spending, in: data)
        if kept > 0 {
            parts.append(String(localized: "You kept \(money(kept)) (income less spending)."))
        } else if kept < 0 {
            parts.append(String(localized: "You spent \(money(-kept)) more than you earned."))
        }
        let others = data.drivers
            .filter { $0.key != .income && $0.key != .spending && $0.value != 0 }
            .sorted { abs($0.value) > abs($1.value) }
            .map { driver -> String in
                let name = String(localized: driver.key.title).lowercased()
                if driver.value > 0 { return String(localized: "\(name) added \(money(driver.value))") }
                return String(localized: "\(name) took \(money(-driver.value))")
            }
        if !others.isEmpty {
            let joined = others.joined(separator: ", ")
            parts.append(joined.prefix(1).uppercased() + joined.dropFirst() + ".")
        }
        return parts.joined(separator: " ")
    }

    private static func amount(_ key: NetWorthDriverKey, in data: NetWorthDrivers) -> Decimal {
        data.drivers.first { $0.key == key }?.value ?? 0
    }
}

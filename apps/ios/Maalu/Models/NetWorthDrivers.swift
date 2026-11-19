import Foundation

/// How net worth moved between two days and what moved it, in the base currency. The drivers add up to `change` exactly.
struct NetWorthDrivers: Decodable {
    let currency: String
    let startDate: String
    let endDate: String
    let start: String
    let end: String
    let change: String
    let drivers: [NetWorthDriver]
    let accounts: [NetWorthAccountChange]

    var startValue: Decimal { Money.decimal(start) ?? 0 }
    var endValue: Decimal { Money.decimal(end) ?? 0 }
    var changeValue: Decimal { Money.decimal(change) ?? 0 }
}

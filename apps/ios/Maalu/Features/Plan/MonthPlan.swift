import Foundation

/// The bills and planned income laid out by day, overdue first, with the running figure: each bill takes its amount off
/// what is available, so you can see which one makes the month run short. Income is listed on its day but never added.
struct MonthPlan {
    let days: [PlanDay]
    /// What is available before any bill: the everyday accounts less what is set aside for goals.
    let startingPoint: Decimal

    /// The first bill that leaves less than nothing: where the plan runs out.
    var firstShort: PlanRow? {
        days.lazy.flatMap(\.rows).first(where: \.isShort)
    }

    init(_ data: AvailableToSpend) {
        let start = (Money.decimal(data.balance) ?? 0) - (Money.decimal(data.reservedTotal) ?? 0)
        startingPoint = start

        let bills = data.bills.map { Self.raw($0, kind: .bill) }
        let cards = data.cardPayments.map {
            Raw(id: $0.accountId, kind: .card, title: String(localized: "\($0.title) card payment"), date: $0.date, isOverdue: $0.overdue,
                amount: $0.amount, account: nil, subscription: nil, isEstimate: false, isTransfer: false)
        }
        let income = data.expected.map { Self.raw($0, kind: .income) }
        let sorted = (bills + cards + income).sorted(by: Self.order)

        var running = start
        var rows: [PlanRow] = []
        for item in sorted {
            var left: Decimal?
            if item.kind != .income {
                running -= Money.decimal(item.amount) ?? 0
                left = running
            }
            rows.append(PlanRow(id: item.id, kind: item.kind, title: item.title, date: item.date, isOverdue: item.isOverdue, amount: item.amount,
                                account: item.account, subscription: item.subscription, isEstimate: item.isEstimate, isTransfer: item.isTransfer, left: left))
        }
        days = Self.group(rows)
    }

    private struct Raw {
        let id: String
        let kind: PlanRow.Kind
        let title: String
        let date: String
        let isOverdue: Bool
        let amount: String
        let account: String?
        let subscription: String?
        let isEstimate: Bool
        let isTransfer: Bool
    }

    private static func raw(_ bill: AvailableBill, kind: PlanRow.Kind) -> Raw {
        Raw(id: bill.id, kind: kind, title: bill.title, date: bill.date, isOverdue: bill.overdue, amount: bill.amount, account: bill.account,
            subscription: bill.subscription, isEstimate: bill.estimate == true, isTransfer: bill.transfer == true)
    }

    /// Overdue first, then by date; income after what is paid on the same day, then by name.
    private static func order(_ a: Raw, _ b: Raw) -> Bool {
        if a.isOverdue != b.isOverdue { return a.isOverdue }
        if a.date != b.date { return a.date < b.date }
        let aIncome = a.kind == .income, bIncome = b.kind == .income
        if aIncome != bIncome { return !aIncome }
        return a.title.localizedStandardCompare(b.title) == .orderedAscending
    }

    private static func group(_ rows: [PlanRow]) -> [PlanDay] {
        var days: [PlanDay] = []
        for row in rows {
            let key = row.isOverdue ? "overdue" : row.date
            if let last = days.last, last.id == key {
                days[days.count - 1] = PlanDay(id: key, date: last.date, rows: last.rows + [row])
            } else {
                days.append(PlanDay(id: key, date: row.isOverdue ? nil : row.date, rows: [row]))
            }
        }
        return days
    }
}

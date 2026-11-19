import SwiftUI

struct NetWorthSection: View {
    let summary: AccountSummary
    let trend: [BalancePoint]

    var body: some View {
        Section("Net worth") {
            MoneyText(summary.total, currency: summary.currency)
                .font(.title)
            LabeledContent("Assets") { MoneyText(summary.assets, currency: summary.currency) }
            LabeledContent("Liabilities") { MoneyText(summary.liabilities, currency: summary.currency) }
            if let change {
                LabeledContent("Change over the month") {
                    MoneyText(change, currency: summary.currency, sign: .always())
                }
            }
            if trend.count > 1 {
                NetWorthChart(points: trend)
            }
            NavigationLink("What moved it", value: DashboardRoute.netWorth)
        }
    }

    private var change: Decimal? {
        guard let first = trend.first, let last = trend.last, trend.count > 1,
              let start = Money.decimal(first.total), let end = Money.decimal(last.total) else { return nil }
        return end - start
    }
}

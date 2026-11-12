import SwiftUI

struct NetWorthSection: View {
    let summary: AccountSummary
    let trend: [BalancePoint]

    var body: some View {
        Section("Net worth") {
            MoneyText(summary.total, currency: summary.currency)
                .font(.title)
                .bold()
            LabeledContent("Assets") { MoneyText(summary.assets, currency: summary.currency) }
            LabeledContent("Liabilities") { MoneyText(summary.liabilities, currency: summary.currency) }
            if let change {
                LabeledContent("Change over the month") {
                    Text(change, format: .currency(code: summary.currency).presentation(.isoCode).sign(strategy: .always()))
                        .monospacedDigit()
                }
            }
            if trend.count > 1 {
                NetWorthChart(points: trend)
            }
        }
    }

    private var change: Decimal? {
        guard let first = trend.first, let last = trend.last, trend.count > 1,
              let start = Money.decimal(first.total), let end = Money.decimal(last.total) else { return nil }
        return end - start
    }
}

import SwiftUI

struct GroupSummarySection: View {
    let detail: GroupDetail

    var body: some View {
        Section {
            AmountRow { Text("Money in") } amount: { MoneyText(detail.moneyIn, currency: detail.currency) }
            AmountRow { Text("Money out") } amount: { MoneyText(detail.moneyOut, currency: detail.currency) }
            AmountRow { Text("Net").bold() } amount: { SignedMoneyText(value: Money.decimal(detail.net) ?? 0, currency: detail.currency).bold() }
            if let dates = GroupText.dates(from: detail.dateFrom, to: detail.dateTo) {
                LabeledContent("Dates", value: dates)
            }
            if let note = detail.note {
                Text(note)
            }
        } footer: {
            Text("In your base currency, counting only transactions that have happened; a refund is money in.")
        }
    }
}

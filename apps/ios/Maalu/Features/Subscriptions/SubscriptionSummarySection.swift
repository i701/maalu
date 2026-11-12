import SwiftUI

struct SubscriptionSummarySection: View {
    let summary: SubscriptionSummary

    var body: some View {
        Section {
            LabeledContent("Active", value: summary.activeCount.formatted())
            AmountRow {
                Text("Costs a month")
            } amount: {
                MoneyText(summary.monthlyBaseTotal, currency: summary.currency)
            }
        }
    }
}

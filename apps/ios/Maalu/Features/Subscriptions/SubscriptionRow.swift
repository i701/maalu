import SwiftUI

struct SubscriptionRow: View {
    let subscription: Subscription

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(subscription.name)
                Text(subscription.dueLine)
                    .font(.subheadline)
                    .foregroundStyle(subscription.isLate ? AnyShapeStyle(.red) : AnyShapeStyle(.secondary))
            }
        } amount: {
            SubscriptionAmountText(amount: subscription.amount, currency: subscription.currency, varies: subscription.amountVaries)
        }
    }
}

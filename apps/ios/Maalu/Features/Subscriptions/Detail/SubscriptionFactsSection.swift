import SwiftUI

struct SubscriptionFactsSection: View {
    let subscription: Subscription
    let baseCurrency: String?

    var body: some View {
        Section {
            LabeledContent("Repeats", value: subscription.everyText)
            LabeledContent("Status", value: String(localized: subscription.status.title))
            if let next = subscription.nextDueDate.flatMap(Subscription.shortDate) {
                LabeledContent("Next due", value: subscription.isOverdue ? String(localized: "\(next) (overdue)") : next)
            }
            if let last = subscription.lastPaidDate.flatMap(Subscription.shortDate) {
                LabeledContent("Last paid", value: last)
            }
            if let account = subscription.account { LabeledContent("Pays from", value: account.name) }
            if let vendor = subscription.vendor { LabeledContent("Vendor", value: vendor.name) }
            LabeledContent("Category", value: subscription.category)
            LabeledContent("Paid with", value: String(localized: subscription.paymentMethod.title))
            if let baseCurrency {
                AmountRow {
                    Text("Costs a month")
                } amount: {
                    MoneyText(subscription.monthlyBaseCost, currency: baseCurrency)
                }
            }
            if let installments = subscription.installmentsText { LabeledContent("Payments", value: installments) }
            LabeledContent("Reminder", value: ReminderOption.title(subscription.remindDaysBefore))
        }
    }
}

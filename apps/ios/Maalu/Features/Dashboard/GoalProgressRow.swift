import SwiftUI

struct GoalProgressRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading) {
            AmountRow {
                Label(goal.name, systemImage: goal.reached ? "checkmark.circle.fill" : "target")
            } amount: {
                Text("\(MoneyFormat.string(goal.saved, currency: goal.currency)) of \(MoneyFormat.string(goal.targetAmount, currency: goal.currency))")
                    .monospacedDigit()
            }
            ProgressView(value: min(Double(goal.percent) / 100, 1))
                .accessibilityLabel(goal.name)
                .accessibilityValue("\(goal.percent)%")
        }
    }
}

import SwiftUI

struct GoalProgressRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading) {
            AmountRow {
                VStack(alignment: .leading) {
                    Label(goal.name, systemImage: goal.reached ? "checkmark.circle.fill" : "target")
                    Text("\(MoneyFormat.string(goal.saved, currency: goal.currency)) of \(MoneyFormat.string(goal.targetAmount, currency: goal.currency))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } amount: {
                Text("\(goal.percent)%").monospacedDigit()
            }
            ProgressView(value: min(Double(goal.percent) / 100, 1))
                .accessibilityLabel(goal.name)
                .accessibilityValue("\(goal.percent)%")
        }
    }
}

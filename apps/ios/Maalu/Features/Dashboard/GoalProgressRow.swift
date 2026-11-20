import SwiftUI

struct GoalProgressRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            AmountRow {
                VStack(alignment: .leading, spacing: 4) {
                    Label(goal.name, systemImage: goal.reached ? "checkmark.circle.fill" : "target")
                    Text("\(MoneyFormat.string(goal.saved, currency: goal.currency)) of \(MoneyFormat.string(goal.targetAmount, currency: goal.currency))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } amount: {
                Text("\(goal.percent)%").numericFont()
            }
            CapsuleProgress(value: min(Double(goal.percent) / 100, 1))
                .accessibilityLabel(goal.name)
                .accessibilityValue("\(goal.percent)%")
        }
    }
}

import SwiftUI

struct GoalRow: View {
    let goal: Goal

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            AmountRow {
                Label(goal.name, systemImage: goal.reached ? "checkmark.circle.fill" : "target")
            } amount: {
                Text("\(goal.percent)%").monospacedDigit()
            }
            ProgressView(value: min(Double(goal.percent) / 100, 1))
                .tint(goal.reached ? Color.green : Color.accentColor)
                .accessibilityLabel(goal.name)
                .accessibilityValue("\(goal.percent)%")
            Text("\(MoneyFormat.string(goal.saved, currency: goal.currency)) of \(MoneyFormat.string(goal.targetAmount, currency: goal.currency))")
                .font(.subheadline)
            Text(goal.reached ? String(localized: "Done") : String(localized: "\(MoneyFormat.string(goal.remaining, currency: goal.currency)) to go"))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if let need = BudgetText.need(of: goal) {
                Text(need).font(.subheadline).foregroundStyle(.secondary)
            }
        }
    }
}

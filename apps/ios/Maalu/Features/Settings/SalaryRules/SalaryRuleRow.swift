import SwiftUI

struct SalaryRuleRow: View {
    let rule: SalaryRule
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack {
                Text(rule.targetName).fontWeight(.medium)
                Text(rule.isGoal ? "goal" : "account").font(.caption).foregroundStyle(.secondary)
            }
            Text(SalaryRuleText.text(rule, currency: currency))
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if rule.auto {
                Label("Moves automatically", systemImage: "bolt").font(.caption).foregroundStyle(.orange)
            }
        }
    }
}

import SwiftUI

/// A salary waiting for its split: what arrived, what an automatic rule already moved, what waits, and the ways to answer.
struct PendingTaskSection: View {
    let task: SalarySplitTask
    let isBusy: Bool
    let onApprove: () -> Void
    let onReview: () -> Void
    let onDismiss: () -> Void

    private var plan: SalarySplitPlan { task.plan }

    var body: some View {
        Section {
            AmountRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text(plan.title.isEmpty ? "Salary" : plan.title).fontWeight(.medium)
                    Text(subtitle).font(.subheadline).foregroundStyle(.secondary)
                }
            } amount: {
                MoneyText(plan.amount, currency: plan.currency)
            }
            ForEach(plan.made) { made in
                AmountRow {
                    Text(made.isTransfer ? "\(made.targetName) · already moved" : "\(made.targetName) · already set aside")
                } amount: {
                    MoneyText(made.amount, currency: plan.currency)
                }
            }
            ForEach(plan.waiting) { item in
                AmountRow {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.targetName)
                        Text(SalaryRuleText.text(mode: item.mode, value: item.value, currency: plan.currency))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                } amount: {
                    MoneyText(item.amount, currency: plan.currency)
                }
            }
            ForEach(plan.blocked) { item in
                Text("\(item.targetName): \(item.reason ?? String(localized: "can't be made"))")
                    .font(.subheadline)
                    .foregroundStyle(.red)
            }
            Button("Approve", systemImage: "checkmark.circle", action: onApprove)
                .disabled(isBusy || plan.waiting.isEmpty || plan.over)
            Button("Review and edit", systemImage: "slider.horizontal.3", action: onReview)
                .disabled(isBusy)
            Button("Dismiss", systemImage: "xmark.circle", role: .destructive, action: onDismiss)
                .disabled(isBusy)
        } footer: {
            if plan.over {
                Text("Adds up to more than the salary.").foregroundStyle(.orange)
            } else {
                Text("Moving \(MoneyFormat.string(plan.total, currency: plan.currency))\(plan.madeTotal > 0 ? " more" : ""). \(MoneyFormat.string(plan.left, currency: plan.currency)) stays in \(plan.accountName).")
            }
        }
    }

    private var subtitle: String {
        let day = plan.salaryDate.flatMap(ISODate.date)?.formatted(.dateTime.day().month(.abbreviated))
        return [day, plan.accountName].compactMap { $0 }.joined(separator: " · ")
    }
}

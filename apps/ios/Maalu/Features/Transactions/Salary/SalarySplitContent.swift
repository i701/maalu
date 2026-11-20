import SwiftUI

/// The rows of a salary split: what arrived, what was already made, the lines to confirm and the way to undo it.
struct SalarySplitContent: View {
    @Bindable var model: SalarySplitModel
    let plan: SalarySplitPlan
    @Binding var isConfirmingUndo: Bool

    var body: some View {
        Section {
            Text("\(MoneyFormat.string(plan.amount, currency: plan.currency)) arrived in \(plan.accountName).")
        }
        if plan.applied {
            Section(plan.complete ? "What was made" : "Already made") {
                ForEach(plan.made) { made in
                    AmountRow {
                        Text(made.isTransfer ? "\(made.targetName) · moved" : "\(made.targetName) · set aside")
                    } amount: {
                        MoneyText(made.amount, currency: plan.currency)
                    }
                }
            }
        }
        if !plan.complete {
            Section {
                if model.lines.isEmpty {
                    Text("You have not set up any rules yet. Choose how your salary is split in Settings.").foregroundStyle(.secondary)
                }
                ForEach($model.lines) { $line in
                    SalarySplitLineRow(line: $line)
                }
            } footer: {
                if let totals = model.totals, !model.lines.isEmpty {
                    if totals.isOver {
                        Text("These add up to more than the salary.").foregroundStyle(.red)
                    } else {
                        Text("Moving \(MoneyFormat.string(totals.total, currency: plan.currency)). \(MoneyFormat.string(totals.left, currency: plan.currency)) stays in \(plan.accountName).")
                    }
                }
            }
        }
        if let message = model.errorMessage {
            Text(message).foregroundStyle(.red)
        }
        if plan.applied {
            Section {
                Button(plan.complete ? "Undo the split" : "Undo what was made", role: .destructive) { isConfirmingUndo = true }
            }
        }
    }
}

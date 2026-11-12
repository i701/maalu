import SwiftUI

struct GoalDetailView: View {
    let goal: Goal

    var body: some View {
        List {
            Section { GoalRow(goal: goal) }
            Section {
                if let account = goal.account {
                    fact("Follows", account.name)
                }
                if let plan = goal.monthlyAmount {
                    fact("Plan", String(localized: "\(MoneyFormat.string(plan, currency: goal.currency)) a month"))
                }
                if let planned = goal.periodPlanned, let status = goal.periodStatus {
                    fact("This period", "\(MoneyFormat.string(goal.periodContributed ?? "0", currency: goal.currency)) / \(MoneyFormat.string(planned, currency: goal.currency)) · \(status == "funded" ? String(localized: "funded") : String(localized: "still to set aside"))")
                }
                if let date = goal.targetDate {
                    fact("Target date", BudgetText.shortDate(date))
                }
            } footer: {
                if goal.account != nil {
                    Text("This goal follows an account: its balance is what you have saved.")
                }
            }
        }
        .navigationTitle(goal.name)
        .navigationBarTitleDisplayMode(.inline)
    }

    private func fact(_ title: LocalizedStringKey, _ value: String) -> some View {
        LabeledContent(title, value: value)
    }
}

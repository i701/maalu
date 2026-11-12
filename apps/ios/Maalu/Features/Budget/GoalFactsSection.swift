import SwiftUI

struct GoalFactsSection: View {
    let goal: Goal

    var body: some View {
        Section {
            if let account = goal.account {
                LabeledContent("Follows", value: account.name)
            }
            if let plan = goal.monthlyAmount {
                LabeledContent("Plan", value: String(localized: "\(MoneyFormat.string(plan, currency: goal.currency)) a month"))
            }
            if let planned = goal.periodPlanned, let status = goal.periodStatus {
                LabeledContent("This period", value: "\(MoneyFormat.string(goal.periodContributed ?? "0", currency: goal.currency)) / \(MoneyFormat.string(planned, currency: goal.currency)) · \(status == "funded" ? String(localized: "funded") : String(localized: "still to set aside"))")
            }
            if let date = goal.targetDate {
                LabeledContent("Target date", value: BudgetText.shortDate(date))
            }
        } footer: {
            if goal.account != nil {
                Text("This goal follows an account: its balance is what you have saved.")
            }
        }
    }
}

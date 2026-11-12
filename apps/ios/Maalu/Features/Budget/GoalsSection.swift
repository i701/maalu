import SwiftUI

struct GoalsSection: View {
    let goals: [Goal]

    var body: some View {
        Section("Goals") {
            if goals.isEmpty {
                Text("Save toward something, like a trip, and see what each month needs.")
                    .foregroundStyle(.secondary)
            }
            ForEach(goals) { goal in
                NavigationLink(value: BudgetRoute.goal(goal)) {
                    GoalRow(goal: goal)
                }
            }
        }
    }
}

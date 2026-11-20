import SwiftUI

struct GoalsSection: View {
    let goals: [Goal]

    var body: some View {
        CardSection {
            if goals.isEmpty {
                Text("Save toward something, like a trip, and see what each month needs.")
                    .foregroundStyle(.secondary)
            }
            ForEach(goals) { goal in
                CardLink(value: BudgetRoute.goal(goal.id)) {
                    GoalRow(goal: goal)
                }
            }
        } header: {
            SectionTitle("Goals")
        }
    }
}

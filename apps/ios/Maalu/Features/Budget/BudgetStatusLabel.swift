import SwiftUI

struct BudgetStatusLabel: View {
    let status: String
    let left: String

    var body: some View {
        Label {
            Text("\(Text(BudgetStatus.title(status))) · \(left)")
        } icon: {
            Image(systemName: BudgetStatus.systemImage(status))
        }
        .font(.subheadline)
        .foregroundStyle(status == "ok" ? Color.secondary : Color(budgetStatus: status))
    }
}

import SwiftUI

/// What the figure counts: the everyday accounts and the goals set aside.
struct PlanSidebarSections: View {
    let available: AvailableToSpend

    var body: some View {
        Section("The accounts it counts") {
            ForEach(available.accounts) { account in
                AmountRow { Text(account.name) } amount: { MoneyText(account.balance, currency: available.currency) }
            }
        }
        if !available.reserved.isEmpty {
            Section("Set aside for goals") {
                ForEach(available.reserved) { reserve in
                    AmountRow { Text(reserve.name) } amount: { MoneyText(reserve.amount, currency: available.currency) }
                }
            }
        }
    }
}

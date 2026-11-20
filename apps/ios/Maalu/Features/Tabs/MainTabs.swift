import SwiftUI

struct MainTabs: View {
    @State private var selection = MainTab.dashboard

    var body: some View {
        // the tab bar takes the selected screen's accent; each screen goes back to the brand's blue so the colour stays in the bar
        TabView(selection: $selection) {
            Tab("Dashboard", systemImage: "chart.bar", value: MainTab.dashboard) {
                DashboardView().tint(.brand)
            }
            Tab("Transactions", systemImage: "receipt", value: MainTab.transactions) {
                TransactionsView().tint(.brand)
            }
            Tab("Accounts", systemImage: "wallet.bifold", value: MainTab.accounts) {
                AccountsView().tint(.brand)
            }
            Tab("Budget", systemImage: "tray.full", value: MainTab.budget) {
                BudgetView().tint(.brand)
            }
            Tab("More", systemImage: "ellipsis.circle", value: MainTab.more) {
                MoreView().tint(.brand)
            }
        }
        .accentTint(selection.accent)
    }
}

import SwiftUI

struct MainTabs: View {
    var body: some View {
        TabView {
            Tab("Dashboard", systemImage: "chart.bar") {
                DashboardView()
            }
            Tab("Transactions", systemImage: "receipt") {
                TransactionsView()
            }
            Tab("Accounts", systemImage: "wallet.bifold") {
                AccountsView()
            }
            Tab("Budget", systemImage: "tray.full") {
                NavigationStack { ComingSoonView(title: "Budget", systemImage: "tray.full") }
            }
            Tab("More", systemImage: "ellipsis.circle") {
                MoreView()
            }
        }
    }
}

import SwiftUI

struct MainTabs: View {
    var body: some View {
        TabView {
            Tab("Dashboard", systemImage: "square.grid.2x2") {
                NavigationStack { ComingSoonView(title: "Dashboard", systemImage: "square.grid.2x2") }
            }
            Tab("Transactions", systemImage: "list.bullet.rectangle") {
                TransactionsView()
            }
            Tab("Accounts", systemImage: "building.columns") {
                AccountsView()
            }
            Tab("Budget", systemImage: "chart.pie") {
                NavigationStack { ComingSoonView(title: "Budget", systemImage: "chart.pie") }
            }
            Tab("More", systemImage: "ellipsis") {
                MoreView()
            }
        }
    }
}

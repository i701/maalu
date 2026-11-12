import SwiftUI

/// The signed-in app: the four places used most, plus More for everything else. A plain `TabView`, so the
/// system draws the bar (Liquid Glass on iOS 26 and later) and handles the sidebar on iPad.
struct MainTabs: View {
    var body: some View {
        TabView {
            Tab("Dashboard", systemImage: "square.grid.2x2") {
                NavigationStack { ComingSoonView(title: "Dashboard", systemImage: "square.grid.2x2") }
            }
            Tab("Transactions", systemImage: "list.bullet.rectangle") {
                NavigationStack { ComingSoonView(title: "Transactions", systemImage: "list.bullet.rectangle") }
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

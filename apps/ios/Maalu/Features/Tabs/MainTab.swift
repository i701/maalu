import SwiftUI

/// The tabs, each with the accent its screen has, which the tab bar takes while it is selected.
enum MainTab: Hashable {
    case dashboard, transactions, accounts, budget, more

    var accent: Color {
        switch self {
        case .dashboard: .accentLime
        case .accounts: .accentGreen
        case .budget: .accentAmber
        case .transactions, .more: .brand
        }
    }
}

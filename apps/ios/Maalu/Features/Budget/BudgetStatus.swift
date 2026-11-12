import SwiftUI

extension Color {
    /// A budget line's colour by status; its words say the same, so colour is never the only signal.
    init(budgetStatus status: String) {
        switch status {
        case "over": self = .red
        case "warning": self = .orange
        default: self = .accentColor
        }
    }
}

enum BudgetStatus {
    static func title(_ status: String) -> LocalizedStringResource {
        switch status {
        case "over": "Over the limit"
        case "warning": "Close to limit"
        default: "On track"
        }
    }

    static func systemImage(_ status: String) -> String {
        switch status {
        case "over": "exclamationmark.triangle"
        case "warning": "exclamationmark.circle"
        default: "checkmark.circle"
        }
    }
}

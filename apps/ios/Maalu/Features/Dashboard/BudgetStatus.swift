import SwiftUI

extension Color {
    /// A budget line's colour by status; the percentage beside it says the same in numbers.
    init(budgetStatus status: String) {
        switch status {
        case "over": self = .red
        case "warning": self = .orange
        default: self = .accentColor
        }
    }
}

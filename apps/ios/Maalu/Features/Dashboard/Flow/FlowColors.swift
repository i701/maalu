import SwiftUI

extension Color {
    /// Income and spending keep the app's green and red; the total and what was saved are blue.
    init(flow kind: MoneyFlow.Kind) {
        switch kind {
        case .income: self = .green
        case .deficit, .spending: self = .red
        case .total, .saved: self = .blue
        }
    }
}

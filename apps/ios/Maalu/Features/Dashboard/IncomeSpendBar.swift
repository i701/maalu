import SwiftUI

/// Two bars side by side, income and spending, as shares of the two together.
struct IncomeSpendBar: View {
    let income: Decimal
    let spent: Decimal
    var color: Color = .brand

    var body: some View {
        GeometryReader { proxy in
            let share = incomeShare
            HStack(spacing: 4) {
                Capsule().fill(color)
                    .frame(width: max(8, (proxy.size.width - 4) * share))
                Capsule().fill(color.opacity(0.3))
            }
        }
        .frame(height: 8)
        .accessibilityHidden(true)
    }

    /// A drawing ratio only, so a Double is fine; with nothing on either side it is half and half.
    private var incomeShare: Double {
        let total = income + spent
        guard total > 0 else { return 0.5 }
        return NSDecimalNumber(decimal: income / total).doubleValue
    }
}

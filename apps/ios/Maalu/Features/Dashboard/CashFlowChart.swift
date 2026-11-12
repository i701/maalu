import Charts
import SwiftUI

struct CashFlowChart: View {
    let months: [MonthlyPoint]

    private static let income = "Income"
    private static let expenses = "Expenses"

    var body: some View {
        Chart(months) { month in
            if let start = month.start {
                BarMark(x: .value("Month", start, unit: .month), y: .value("Amount", month.incomeValue.doubleValue))
                    .foregroundStyle(by: .value("Type", Self.income))
                    .position(by: .value("Type", Self.income))
                BarMark(x: .value("Month", start, unit: .month), y: .value("Amount", month.expenseValue.doubleValue))
                    .foregroundStyle(by: .value("Type", Self.expenses))
                    .position(by: .value("Type", Self.expenses))
            }
        }
        .chartForegroundStyleScale([Self.income: Color.green, Self.expenses: Color.red])
        .chartXAxis {
            AxisMarks(values: .stride(by: .month, count: months.count > 6 ? 2 : 1)) { _ in
                AxisGridLine()
                AxisValueLabel(format: .dateTime.month(.abbreviated))
            }
        }
        .frame(height: 200)
        .accessibilityLabel("Income and expenses by month")
    }
}

private extension Decimal {
    var doubleValue: Double { NSDecimalNumber(decimal: self).doubleValue }
}

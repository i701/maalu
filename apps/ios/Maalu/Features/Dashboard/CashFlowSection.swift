import SwiftUI

struct CashFlowSection: View {
    let months: [MonthlyPoint]
    let currency: String
    @State private var range = CashFlowRange.sixMonths

    var body: some View {
        Section("Cash flow") {
            Picker("Range", selection: $range) {
                ForEach(CashFlowRange.allCases) { range in
                    Text(range.title).tag(range)
                }
            }
            .pickerStyle(.segmented)
            CashFlowChart(months: shown)
            if let latest = months.last, let start = latest.start {
                Text(start, format: .dateTime.month(.wide).year())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                LabeledContent("Income") { MoneyText(latest.incomeValue, currency: currency) }
                LabeledContent("Spent") { MoneyText(latest.expenseValue, currency: currency) }
                LabeledContent("Kept") { MoneyText(latest.kept, currency: currency) }
            }
        }
    }

    private var shown: [MonthlyPoint] {
        Array(months.suffix(range.rawValue))
    }
}

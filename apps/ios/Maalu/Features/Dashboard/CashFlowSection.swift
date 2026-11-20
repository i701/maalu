import SwiftUI

struct CashFlowSection: View {
    let months: [MonthlyPoint]
    let currency: String
    @State private var range = CashFlowRange.sixMonths

    var body: some View {
        Section {
            Picker("Range", selection: $range) {
                ForEach(CashFlowRange.allCases) { range in
                    Text(range.title).tag(range)
                }
            }
            .pickerStyle(.segmented)
            CashFlowChart(months: shown.map(\.point))
            if let latest = months.last, let start = latest.start {
                Text(start, format: .dateTime.month(.wide).year())
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                LabeledContent("Income") { MoneyText(latest.incomeValue, currency: currency) }
                LabeledContent("Spent") { MoneyText(latest.expenseValue, currency: currency) }
                LabeledContent("Kept") { MoneyText(latest.kept, currency: currency) }
            }
            VStack(alignment: .leading) {
                Text("Kept each month").font(.headline)
                KeptChart(months: shown)
            }
            if shown.count > 1, let first = shown.first?.point.start, let last = shown.last {
                VStack(alignment: .leading) {
                    Text("Kept in total").font(.headline)
                    KeptTotalChart(months: shown)
                }
                AmountRow {
                    Text("Since \(first, format: .dateTime.month(.wide).year())")
                } amount: {
                    MoneyText(last.running, currency: currency)
                }
            }
            NavigationLink("Show as Table", value: DashboardRoute.cashFlowTable(months: range.rawValue))
        } header: {
            SectionTitle("Cash flow")
        }
    }

    private var shown: [KeptMonth] {
        KeptMonth.months(from: months.suffix(range.rawValue))
    }
}

import SwiftUI

struct IncomeRuleSection: View {
    let rule: IncomeRule
    let currency: String

    var body: some View {
        Section {
            ForEach(rule.rows) { row in
                VStack(alignment: .leading) {
                    AmountRow {
                        VStack(alignment: .leading) {
                            Text(row.key.title)
                            Text(row.key.targetText).font(.subheadline).foregroundStyle(.secondary)
                        }
                    } amount: {
                        Text("\(row.percent, format: .number.precision(.fractionLength(0...1)))%").monospacedDigit()
                    }
                    ProgressView(value: min(max(row.percent / 100, 0), 1))
                        .accessibilityLabel(Text(row.key.title))
                        .accessibilityValue(Text(row.status.title))
                    Label { Text(row.status.title) } icon: { Image(systemName: row.status.systemImage) }
                        .font(.subheadline)
                        .foregroundStyle(row.status == .on ? Color.secondary : Color.orange)
                }
            }
            if let unsorted = rule.unsorted, let percent = rule.unsortedPercent {
                Text("\(MoneyFormat.string(unsorted, currency: currency)) (\(percent, format: .number.precision(.fractionLength(0...1)))%) is spent in categories not sorted into needs or wants, so it counts against what is kept but is not judged.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } header: {
            Text("Against 50/30/20 of your income")
        }
    }
}

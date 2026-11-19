import SwiftUI

struct FixedBudgetLineFactsSection: View {
    let line: FixedBudgetLine
    let currency: String

    var body: some View {
        Section {
            AmountRow { Text("Limit for these dates") } amount: { MoneyText(line.amount, currency: currency) }
            AmountRow { Text("Spent") } amount: { MoneyText(line.activity, currency: currency) }
            LabeledContent("From", value: day(line.startDate))
            LabeledContent("Until", value: day(line.endDate))
            LabeledContent("Categories", value: line.categories.map(\.name).formatted())
            if let warnPercent = line.warnPercent { LabeledContent("Warns at", value: (Double(warnPercent) / 100).formatted(.percent)) }
            if let kind = line.kind { LabeledContent("Kind", value: kind == "need" ? String(localized: "Need") : String(localized: "Want")) }
        } footer: {
            Text("One total for the whole stretch, counted once, not per month.")
        }
    }

    private func day(_ iso: String) -> String {
        ISODate.date(iso)?.formatted(.dateTime.day().month(.wide).year()) ?? iso
    }
}

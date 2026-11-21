import SwiftUI

/// Spending month by month, stacked by category: the figure, 6 or 12 months of bars, and a chip for each category. Press and drag along the bars to pick a month; hold a chip to follow one category through them.
/// The design is Bencho's Traffic block (MIT, bencho.dev), redrawn with Swift Charts.
struct SpendingTrendSection: View {
    let categoryMonths: CategoryMonths
    @State private var count = 6
    @State private var selectedDate: Date?
    @State private var held: String?

    var body: some View {
        let stack = SpendingStack.make(from: categoryMonths, last: count)
        VStack(alignment: .leading, spacing: 10) {
            SectionTitle("Spending by month")
                .foregroundStyle(.secondary)
                .padding(.horizontal, Spacing.card)
            if let stack {
                let reading = stack.reading(month: selectedDate.flatMap { stack.month(containing: $0) }, held: held)
                VStack(alignment: .leading, spacing: 14) {
                    HStack(alignment: .top) {
                        MeterFigure(amount: reading.amount, caption: reading.caption, currency: categoryMonths.currency)
                        Spacer()
                        Picker("Months", selection: $count) {
                            Text("6 mo").tag(6)
                            Text("12 mo").tag(12)
                        }
                        .pickerStyle(.segmented)
                        .frame(width: 120)
                    }
                    SpendingTrendChart(stack: stack, selectedDate: $selectedDate, held: held)
                    HStack {
                        Text(stack.months.first?.start ?? .now, format: .dateTime.month(.abbreviated).year(.twoDigits))
                        Spacer()
                        Text(stack.months.last?.start ?? .now, format: .dateTime.month(.abbreviated).year(.twoDigits))
                    }
                    .font(.caption)
                    .foregroundStyle(.tertiary)
                    WrapLayout(spacing: 6) {
                        ForEach(Array(stack.names.enumerated()), id: \.element) { rank, name in
                            MeterChip(
                                name: name,
                                color: stack.color(at: rank),
                                value: stack.total(of: name).formatted(.currency(code: categoryMonths.currency)),
                                isOn: held == name
                            ) { toggle(name) }
                        }
                    }
                }
                .padding(Spacing.card)
                .frame(maxWidth: .infinity, alignment: .leading)
                .card()
            }
        }
        .animation(.smooth(duration: 0.3), value: held)
        .animation(.smooth(duration: 0.3), value: count)
        .onChange(of: count) { held = nil }
    }

    private func toggle(_ name: String) {
        held = held == name ? nil : name
    }
}

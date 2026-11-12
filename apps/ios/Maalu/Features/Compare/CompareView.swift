import SwiftUI

struct CompareView: View {
    @Environment(Session.self) private var session
    @State private var model = CompareModel()

    var body: some View {
        @Bindable var model = model
        List {
            Section {
                Picker("Periods", selection: $model.preset) {
                    ForEach(ComparePreset.allCases) { preset in
                        Text(String(localized: preset.title)).tag(preset)
                    }
                }
                if model.preset == .custom {
                    DatePicker("Now: from", selection: $model.pickerNowFrom, displayedComponents: .date)
                        .foregroundStyle(model.nowFrom == nil ? .secondary : .primary)
                    DatePicker("Now: to", selection: $model.pickerNowTo, displayedComponents: .date)
                        .foregroundStyle(model.nowTo == nil ? .secondary : .primary)
                    DatePicker("Before: from", selection: $model.pickerBeforeFrom, displayedComponents: .date)
                        .foregroundStyle(model.beforeFrom == nil ? .secondary : .primary)
                    DatePicker("Before: to", selection: $model.pickerBeforeTo, displayedComponents: .date)
                        .foregroundStyle(model.beforeTo == nil ? .secondary : .primary)
                    Button("Clear the custom dates", role: .destructive, action: model.clearCustom)
                }
            } footer: {
                Text("A month is the whole month, so this one is not over yet; a year is the year so far against the same days a year before.")
            }
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if let periods = model.periods, let totals = model.totals {
                Section {
                    Text(rangeLine(periods))
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                Section("Income, spending and what was kept") {
                    CompareTotalRow(title: "Income", change: totals.income, currency: model.currency, against: periods.before.label, goodWhenUp: true)
                    CompareTotalRow(title: "Spending", change: totals.expense, currency: model.currency, against: periods.before.label, goodWhenUp: false)
                    CompareTotalRow(title: "Kept", change: totals.kept, currency: model.currency, against: periods.before.label, goodWhenUp: true)
                }
                if let sentence = model.sentence {
                    Section {
                        Text(sentence)
                    }
                }
                if !model.chartRows.isEmpty {
                    Section {
                        CompareChart(rows: model.chartRows)
                    } header: {
                        Text("Spending by category")
                    } footer: {
                        Text("The biggest categories, now against before.")
                    }
                }
                if let rows = model.spendingRows, !rows.isEmpty {
                    CompareSection(title: "Spending, category by category", rows: rows, currency: model.currency, goodWhenUp: false)
                }
                if let rows = model.kindRows, !rows.isEmpty {
                    CompareSection(title: "Needs and wants", rows: rows, currency: model.currency, goodWhenUp: false)
                }
                if let rows = model.incomeRows, !rows.isEmpty {
                    CompareSection(title: "Income, category by category", rows: rows, currency: model.currency, goodWhenUp: true)
                }
            } else if model.isCustomIncomplete && model.errorMessage == nil {
                Section {
                    Text("Pick both ranges to compare. Each needs a start and an end, in order.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .overlay { ComparePlaceholder(model: model) }
        .navigationTitle("Compare")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: model.queryKey) { await load() }
    }

    private func rangeLine(_ periods: ComparePeriods) -> String {
        var line = "Now: \(ComparePreset.describeRange(periods.now.from, periods.now.to)) · Before: \(ComparePreset.describeRange(periods.before.from, periods.before.to))"
        if model.preset == .thisMonth {
            line += " · \(String(localized: "this month is not over yet"))"
        }
        return line
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}

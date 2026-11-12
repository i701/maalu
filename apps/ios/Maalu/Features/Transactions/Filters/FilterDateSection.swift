import SwiftUI

struct FilterDateSection: View {
    @Binding var filter: TransactionFilter

    var body: some View {
        Section {
            DatePicker("From", selection: $filter.fromDate, displayedComponents: .date)
                .foregroundStyle(filter.dateFrom == nil ? .secondary : .primary)
            DatePicker("Until", selection: $filter.toDate, displayedComponents: .date)
                .foregroundStyle(filter.dateTo == nil ? .secondary : .primary)
            Menu("Quick range") {
                ForEach(DatePreset.allCases) { preset in
                    Button(String(localized: preset.title)) { apply(preset) }
                }
                Button("Any date", role: .destructive, action: clear)
            }
        } header: {
            Text("Date")
        } footer: {
            Text("Choose a day to filter by date. Dates shown in grey are not applied.")
        }
    }

    private func apply(_ preset: DatePreset) {
        let range = preset.range()
        filter.dateFrom = range.from
        filter.dateTo = range.to
    }

    private func clear() {
        filter.dateFrom = nil
        filter.dateTo = nil
    }
}

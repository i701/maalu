import SwiftUI

struct TrendsView: View {
    @Environment(Session.self) private var session
    @State private var model = TrendsModel()

    var body: some View {
        @Bindable var model = model
        List {
            Section {
                Picker("Show", selection: $model.kind) {
                    ForEach(TrendsKind.allCases) { Text(String(localized: $0.title)).tag($0) }
                }
                Picker("Months", selection: $model.months) {
                    ForEach(TrendsMath.ranges, id: \.self) { Text("\($0) months").tag($0) }
                }
                Picker("View", selection: $model.layout) {
                    ForEach(TrendsLayout.allCases) { Text(String(localized: $0.title)).tag($0) }
                }
            }
            .pickerStyle(.segmented)
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if let data = model.data {
                if model.rows.isEmpty {
                    Text(model.kind == .spending ? "No spending in these \(data.months.count) months." : "No income in these \(data.months.count) months.")
                        .foregroundStyle(.secondary)
                } else if model.layout == .table {
                    Section {
                        TrendsTable(data: data, rows: model.rows, tint: model.kind == .spending ? .orange : .green)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 0))
                    } footer: {
                        Text("\(data.currency). Shaded by share of the biggest month.")
                    }
                } else {
                    Section {
                        TrendsChart(months: data.months, series: TrendStack.series(model.rows))
                    } footer: {
                        Text("A refund past a category's spending counts as zero here; the table has the exact figures.")
                    }
                }
            }
        }
        .overlay { if model.isLoading && model.data == nil { ProgressView() } }
        .gradientHeader(.accentLime)
        .navigationTitle("Trends")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: model.months) { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}

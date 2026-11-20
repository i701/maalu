import SwiftUI

/// How the market rate of an account's currency moved against the base currency, next to the rate the account is valued at.
struct RateHistoryView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model = RateHistoryModel()
    let account: Account
    let baseCurrency: String

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            List {
                Section {
                    Picker("How far back", selection: $model.range) {
                        ForEach(AccountHistoryRange.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.orange)
                }
                if let history = model.history, let summary = model.summary {
                    Section {
                        RateHistoryChart(points: history.points)
                    } header: {
                        Text("\(account.currency) to \(baseCurrency)")
                    } footer: {
                        Text("Low \(RateSummary.text(summary.low)) · High \(RateSummary.text(summary.high)) · Moved \(summary.change.formatted(.number.precision(.fractionLength(2)).sign(strategy: .always())))% over the period. Source: \(history.source).")
                    }
                    Section {
                        LabeledContent("Market now", value: RateSummary.text(summary.last))
                        LabeledContent("This account is valued at", value: RateSummary.text(Money.decimal(account.exchangeRate) ?? 1) + (account.autoRate ? " · " + String(localized: "kept up to date") : ""))
                    }
                }
            }
            .overlay { if model.isLoading && model.history == nil { ProgressView() } }
            .navigationTitle("Rate history")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } }
            }
            .task(id: model.range) { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(from: account.currency, to: baseCurrency, using: api)
    }
}

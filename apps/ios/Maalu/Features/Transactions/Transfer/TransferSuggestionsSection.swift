import SwiftUI

/// "Looks like one transfer": pairs that look like one move of your own money entered twice. Closed until opened. Nothing is merged
/// until you confirm, and "Not a pair" stops a pair being suggested again.
struct TransferSuggestionsSection: View {
    @Environment(Session.self) private var session
    @State private var isOpen = false
    @State private var confirming: TransferSuggestion?
    @State private var isBusy = false
    let suggestions: [TransferSuggestion]
    /// Runs after a pair was merged or dismissed, with a line to show.
    let onChanged: (String) -> Void
    let onFailed: (String) -> Void

    var body: some View {
        Section {
            DisclosureGroup(isExpanded: $isOpen) {
                ForEach(suggestions) { pair in
                    VStack(alignment: .leading, spacing: 8) {
                        TransferSideRow(label: "Out", transaction: pair.expense)
                        TransferSideRow(label: "In", transaction: pair.income)
                        Text(TransferLinkRules.daysApartText(pair.daysApart)).font(.caption).foregroundStyle(.secondary)
                        HStack {
                            Button("Make one transfer") { confirming = pair }
                            Button("Not a pair", role: .destructive) { dismiss(pair) }
                        }
                        .buttonStyle(.bordered)
                        .disabled(isBusy)
                    }
                }
            } label: {
                VStack(alignment: .leading, spacing: 2) {
                    Label("Looks like one transfer", systemImage: "arrow.left.arrow.right")
                    Text("\(suggestions.count) \(suggestions.count == 1 ? "pair" : "pairs") entered twice, as an expense and an income.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .confirmationDialog("Make one transfer", isPresented: Binding(get: { confirming != nil }, set: { if !$0 { confirming = nil } }), titleVisibility: .visible, presenting: confirming) { pair in
            Button("Make transfer") { link(pair) }
        } message: { pair in
            Text(TransferLinkRules.sentence(expense: pair.expense, income: pair.income))
        }
    }

    private func link(_ pair: TransferSuggestion) {
        Task {
            guard let api = session.api else { return }
            isBusy = true
            defer { isBusy = false }
            if let message = await TransferLinker.link(expense: pair.expense, income: pair.income, using: api) {
                onFailed(message)
            } else {
                onChanged(TransferLinkRules.linkedMessage)
            }
        }
    }

    private func dismiss(_ pair: TransferSuggestion) {
        Task {
            guard let api = session.api else { return }
            isBusy = true
            defer { isBusy = false }
            if let message = await TransferLinker.dismiss(expense: pair.expense, income: pair.income, using: api) {
                onFailed(message)
            } else {
                onChanged(String(localized: "Okay, that pair will not be suggested again."))
            }
        }
    }
}

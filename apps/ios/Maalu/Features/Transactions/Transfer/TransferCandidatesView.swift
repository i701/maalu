import SwiftUI

/// Pair an entry by hand: choose the other half of the same move from what the server found (the opposite side, exactly the same amount,
/// in another account), then confirm.
struct TransferCandidatesView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var chosen: (expense: Transaction, income: Transaction)?
    @State private var errorMessage: String?
    let base: Transaction
    let matches: [Transaction]
    let onLinked: () -> Void

    var body: some View {
        NavigationStack {
            List {
                Section {
                    TransferSideRow(label: base.type == .expense ? "Out" : "In", transaction: base)
                } footer: {
                    Text(base.type == .expense
                        ? "Which income is this same money arriving in another account?"
                        : "Which expense is this same money leaving another account?")
                }
                Section {
                    ForEach(matches) { match in
                        Button { chosen = TransferLinkRules.pair(base, match) } label: {
                            TransferSideRow(label: match.type == .expense ? "Out" : "In", transaction: match)
                        }
                        .foregroundStyle(.primary)
                    }
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Pick the matching entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel", role: .cancel) { dismiss() } }
            }
            .confirmationDialog("Make one transfer", isPresented: Binding(get: { chosen != nil }, set: { if !$0 { chosen = nil } }), titleVisibility: .visible) {
                Button("Make transfer", action: link)
            } message: {
                if let chosen { Text(TransferLinkRules.sentence(expense: chosen.expense, income: chosen.income)) }
            }
        }
    }

    private func link() {
        guard let pair = chosen else { return }
        Task {
            guard let api = session.api else { return }
            if let message = await TransferLinker.link(expense: pair.expense, income: pair.income, using: api) {
                errorMessage = message
            } else {
                onLinked()
                dismiss()
            }
        }
    }
}

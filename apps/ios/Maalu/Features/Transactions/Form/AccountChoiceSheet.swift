import SwiftUI

/// The accounts to pick one from, each with its number and balance under its name in muted text, so two accounts of one bank can be told apart.
struct AccountChoiceSheet: View {
    let accounts: [Account]
    @Binding var selection: String?
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List(accounts) { account in
                Button { choose(account) } label: {
                    HStack(spacing: 12) {
                        VStack(alignment: .leading, spacing: 2) {
                            HStack(spacing: 8) {
                                Text(account.name).fontWeight(.medium)
                                Text(account.currency).font(.footnote).foregroundStyle(.secondary)
                            }
                            Text(account.numberAndBalance)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        if account.id == selection { Image(systemName: "checkmark").font(.footnote.weight(.semibold)) }
                    }
                    .contentShape(.rect)
                }
                .buttonStyle(.plain)
            }
            .navigationTitle("Account")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationBackground(Color(.systemGroupedBackground))
    }

    private func choose(_ account: Account) {
        selection = account.id
        dismiss()
    }
}

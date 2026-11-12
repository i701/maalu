import SwiftUI

struct AdjustBalanceView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var draft = AdjustBalanceDraft()
    @State private var isSaving = false
    @State private var errorMessage: String?
    let account: Account
    let onSaved: () -> Void

    private var balance: Decimal { Money.decimal(account.balance) ?? 0 }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("How", selection: $draft.mode) {
                        ForEach(AdjustBalanceDraft.Mode.allCases) { mode in
                            Text(mode.title).tag(mode)
                        }
                    }
                    .pickerStyle(.segmented)
                    SignedDecimalField("Amount in \(account.currency)", value: $draft.value)
                    DatePicker("Takes effect", selection: $draft.date, displayedComponents: .date)
                    TextField("Note (optional)", text: $draft.note, axis: .vertical)
                } footer: {
                    if let after = draft.preview(from: balance) {
                        Text("The balance goes from \(MoneyFormat.string(balance, currency: account.currency)) to \(MoneyFormat.string(after, currency: account.currency)). It is not counted as income or spending.")
                    } else {
                        Text("Use this when the balance here does not match the bank's.")
                    }
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .navigationTitle("Adjust Balance")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(isSaving || draft.problem != nil)
                }
            }
        }
    }

    private func save() {
        Task {
            guard let api = session.api else { return }
            isSaving = true
            errorMessage = nil
            let result: ApiResult<Transaction> = await api.postJSON("accounts/\(account.id)/adjust", body: draft.request())
            isSaving = false
            if case .failed(_, let message) = result {
                errorMessage = message
            } else {
                onSaved()
                dismiss()
            }
        }
    }
}

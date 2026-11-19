import SwiftUI

struct CardFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: CardFormModel
    private let onSaved: () -> Void

    init(account: Account, kind: CardKind, editing card: Card? = nil, accounts: [Account], onSaved: @escaping () -> Void) {
        _model = State(initialValue: CardFormModel(account: account, kind: kind, editing: card, accounts: accounts))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.name)
                    TextField("Last four digits", text: $model.lastDigits)
                        .keyboardType(.numberPad)
                } footer: {
                    Text("Only the last four digits are kept, never the whole number.")
                }
                if model.kind == .credit {
                    Section {
                        Picker("Repaid from", selection: $model.repayAccountID) {
                            Text("Not set").tag(String?.none)
                            ForEach(model.repayChoices) { account in
                                Text(account.name).tag(Optional(account.id))
                            }
                        }
                    } footer: {
                        Text("Repay then starts a transfer from this account into the card.")
                    }
                }
                if let problem = model.problem, !model.name.isEmpty {
                    Text(problem).foregroundStyle(.red)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .saving(model.isSaving)
            .navigationTitle(model.isEditing ? "Edit Card" : model.kind == .credit ? "New Credit Card" : "New Debit Card")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(model.isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton(isSaving: model.isSaving, isEnabled: model.canSave, action: save)
                }
            }
        }
    }

    private func save() {
        Task {
            guard let api = session.api, await model.save(using: api) else { return }
            onSaved()
            dismiss()
        }
    }
}

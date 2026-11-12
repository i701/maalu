import SwiftUI

struct AccountFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: AccountFormModel
    private let onSaved: () -> Void

    init(editing account: Account? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: AccountFormModel(editing: account))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                AccountBasicsSection(model: model)
                AccountMoneySection(model: model)
                if model.draft.group == .card {
                    AccountCardSection(model: model)
                }
                AccountDetailsSection(model: model)
                AccountStatsSection(model: model)
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isLoading { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Account" : "New Account")
            .navigationBarTitleDisplayMode(.inline)
            .onChange(of: model.draft.currency) { model.currencyChanged() }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!model.canSave)
                }
            }
            .task { await load() }
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func save() {
        Task {
            guard let api = session.api, await model.save(using: api) else { return }
            onSaved()
            dismiss()
        }
    }
}

import SwiftUI

struct GoalFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: GoalFormModel
    private let currency: String
    private let onSaved: () -> Void

    init(editing goal: Goal? = nil, currency: String, onSaved: @escaping () -> Void) {
        _model = State(initialValue: GoalFormModel(editing: goal))
        self.currency = currency
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    DecimalField("Target in \(currency)", value: $model.draft.target)
                }
                Section {
                    Picker("Follows an account", selection: $model.draft.accountID) {
                        Text("None: I set money aside by hand").tag(String?.none)
                        ForEach(model.accounts) { account in
                            Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                        }
                    }
                } footer: {
                    Text("A goal that follows an account counts that account's balance as saved.")
                }
                Section {
                    DecimalField("Plan to set aside each month", value: $model.draft.monthly)
                    Toggle("Target date", isOn: $model.draft.hasTargetDate)
                    if model.draft.hasTargetDate {
                        DatePicker("Reach it by", selection: $model.draft.targetDate, displayedComponents: .date)
                    }
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .navigationTitle(model.isEditing ? "Edit Goal" : "New Goal")
            .navigationBarTitleDisplayMode(.inline)
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

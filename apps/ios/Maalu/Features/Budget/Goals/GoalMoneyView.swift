import SwiftUI

struct GoalMoneyView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: GoalMoneyModel
    private let goal: Goal
    private let onSaved: () -> Void

    init(goal: Goal, onSaved: @escaping () -> Void) {
        _model = State(initialValue: GoalMoneyModel(goalID: goal.id))
        self.goal = goal
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("Direction", selection: $model.draft.direction) {
                        ForEach(GoalMoneyDraft.Direction.allCases) { direction in
                            Text(direction.title).tag(direction)
                        }
                    }
                    .pickerStyle(.segmented)
                    DecimalField("Amount in \(goal.currency)", value: $model.draft.amount)
                    TextField("Note (optional)", text: $model.draft.note, axis: .vertical)
                } footer: {
                    Text("Saved so far: \(MoneyFormat.string(goal.saved, currency: goal.currency))")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .navigationTitle(goal.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!model.canSave)
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

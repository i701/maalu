import SwiftUI

struct BudgetSettingsView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: BudgetSettingsModel
    private let onSaved: () -> Void

    init(budget: Budget, onSaved: @escaping () -> Void) {
        _model = State(initialValue: BudgetSettingsModel(budget: budget))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Stepper("Month starts on day \(model.startDay)", value: $model.startDay, in: 1...BudgetSettingsModel.maxStartDay)
                } footer: {
                    Text("Set it to the day you are paid to budget from payday to payday.")
                }
                Section {
                    LabeledContent("Warn at", value: "\(model.warnPercent)%")
                    Slider(value: $model.warnLevel, in: 1...100) { Text("Warn at") }
                        .accessibilityValue("\(model.warnPercent)%")
                } footer: {
                    Text("A limit shows a warning once this much is spent. A limit can have its own level.")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .navigationTitle("Budget Settings")
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

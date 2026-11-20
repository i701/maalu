import SwiftUI

struct MakeSubscriptionView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: MakeSubscriptionModel
    let onSaved: () -> Void

    init(transaction: Transaction, onSaved: @escaping () -> Void) {
        _model = State(initialValue: MakeSubscriptionModel(transaction: transaction))
        self.onSaved = onSaved
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    LabeledContent("Every") {
                        OptionalIntField("1", value: $model.draft.count, maxDigits: 3).multilineTextAlignment(.trailing)
                    }
                    Picker("Unit", selection: $model.draft.unit) {
                        ForEach(IntervalUnit.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    Text(model.summary)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .saving(model.isSaving)
            .navigationTitle("Make this a subscription")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(model.isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton("Make", isSaving: model.isSaving, isEnabled: model.canSave, action: save)
                }
            }
        }
    }

    private func save() {
        Task {
            guard let api = session.api else { return }
            if await model.save(using: api) {
                onSaved()
                dismiss()
            }
        }
    }
}

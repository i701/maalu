import SwiftUI

struct MarkPaidForm: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @Bindable var model: MarkPaidFormModel
    let onDone: () -> Void

    var body: some View {
        Form {
            Section {
                LabeledContent("Planned", value: model.planned.title)
                DatePicker("Date", selection: $model.draft.date, displayedComponents: .date)
                if !model.draft.isTransfer {
                    LabeledContent {
                        DecimalField("0", value: $model.draft.amount).multilineTextAlignment(.trailing)
                    } label: {
                        Text(model.draft.verb.amountLabel)
                        Text(model.planned.currency).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
            if model.draft.isForeign {
                MarkPaidForeignSection(model: model)
            }
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
        }
        .navigationTitle(Text(model.draft.verb.action))
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

    private func save() {
        Task {
            guard let api = session.api, await model.save(using: api) else { return }
            onDone()
            dismiss()
        }
    }
}

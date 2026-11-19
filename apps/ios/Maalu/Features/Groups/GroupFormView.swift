import SwiftUI

struct GroupFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: GroupFormModel
    private let onSaved: () -> Void

    init(editing group: TransactionGroup? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: GroupFormModel(editing: group))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.name)
                    TextField("Note", text: $model.note, axis: .vertical)
                } footer: {
                    Text("A trip, instalments, a treatment over weeks: a group shows what they add up to and changes nothing else.")
                }
                if !model.isEditing {
                    Section {
                        NavigationLink {
                            TransactionPickerView(selection: $model.selection)
                        } label: {
                            LabeledContent("Transactions") {
                                Text("^[\(model.selection.count) chosen](inflect: true)")
                            }
                        }
                    } footer: {
                        Text("Two to fifty, none of them a transfer or in another group.")
                    }
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .saving(model.isSaving)
            .navigationTitle(model.isEditing ? "Edit Group" : "New Group")
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

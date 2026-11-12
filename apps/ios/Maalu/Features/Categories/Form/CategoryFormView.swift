import SwiftUI

struct CategoryFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: CategoryFormModel
    private let onSaved: () -> Void

    init(editing category: Category? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: CategoryFormModel(editing: category))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                        .disabled(model.isSalary)
                } footer: {
                    if model.isSalary {
                        Text("The default Salary category keeps its name.")
                    }
                }
                Section {
                    ColorSwatchGrid(selection: model.draft.color, allowsAutomatic: !model.isEditing) { color in
                        model.draft.color = color
                    }
                } footer: {
                    if !model.isEditing {
                        Text("Left automatic, the colour you use least is picked.")
                    }
                }
                Section("Parent") {
                    if model.parentChoices.isEmpty {
                        Text(model.isSalary ? "The default Salary category is top-level." : "A category with sub-categories cannot be nested.")
                            .foregroundStyle(.secondary)
                    } else {
                        Picker("Parent", selection: $model.draft.parentId) {
                            Text("None").tag(String?.none)
                            ForEach(model.parentChoices) { category in
                                Text(category.name).tag(Optional(category.id))
                            }
                        }
                    }
                }
                Section("Need or want") {
                    Picker("Kind", selection: $model.draft.kind) {
                        Text("Not sorted").tag(CategoryKind?.none)
                        ForEach(CategoryKind.allCases) { kind in
                            Text(String(localized: kind.title)).tag(Optional(kind))
                        }
                    }
                    .pickerStyle(.segmented)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isSaving { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Category" : "New Category")
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

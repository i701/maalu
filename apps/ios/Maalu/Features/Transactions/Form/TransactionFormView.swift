import SwiftUI

struct TransactionFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: TransactionFormModel
    @State private var isPickingTemplate = false
    @State private var isSavingTemplate = false
    private let onSaved: () -> Void

    init(editing transaction: Transaction? = nil, duplicating copy: Transaction? = nil, startingFrom template: TransactionTemplate? = nil, seed: TransactionDraft? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: TransactionFormModel(editing: transaction, duplicating: copy, startingFrom: template, seed: seed))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                TransactionTypeSection(model: model)
                TransactionAccountSection(model: model)
                if model.draft.type != .transfer {
                    TransactionDetailsSection(model: model)
                    TransactionItemsSection(model: model)
                }
                TransactionDateSection(model: model)
                TransactionLocationSection(model: model)
                if !model.isEditing {
                    TransactionAttachmentsSection(model: model)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                if !model.isEditing {
                    Section {
                        Button("Save and Add Another", action: saveAndAddAnother).disabled(!model.canSave)
                    } footer: {
                        if model.savedCount > 0 {
                            Text("Saved \(model.savedCount). Enter the next one.")
                        }
                    }
                }
            }
            .sensoryFeedback(.success, trigger: model.savedCount)
            .overlay { if model.isLoading { ProgressView() } }
            .saving(model.isSaving)
            .navigationTitle(model.isEditing ? "Edit Transaction" : "New Transaction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(model.savedCount > 0 ? "Done" : "Cancel", role: .cancel, action: close)
                        .disabled(model.isSaving)
                }
                ToolbarItem(placement: .primaryAction) {
                    if !model.isEditing {
                        Menu("Template", systemImage: "bookmark") {
                            if !model.templates.isEmpty {
                                Button("Start from a template", systemImage: "bookmark") { isPickingTemplate = true }
                            }
                            Button("Save as template", systemImage: "bookmark.fill") { isSavingTemplate = true }
                        }
                        .disabled(model.isSaving)
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton(isSaving: model.isSaving, isEnabled: model.canSave, action: save)
                }
            }
            .sheet(isPresented: $isPickingTemplate) {
                TemplatePickerSheet(templates: model.templates) { model.apply($0) }
            }
            .sheet(isPresented: $isSavingTemplate) {
                TemplateNameSheet(title: "Save as template", helper: "Fills in the account, category, vendor, method and amount (if you typed one).") { name in
                    await saveTemplate(named: name)
                }
            }
            .navigationDestination(for: NameField.self) { field in
                switch field {
                case .category:
                    NamePickerView(title: "Category", options: model.categories, selection: $model.draft.category)
                case .vendor:
                    NamePickerView(title: "Vendor", options: model.vendors, allowsNone: true, selection: $model.draft.vendor)
                case .itemCategory(let id):
                    NamePickerView(title: "Category", options: model.categories, selection: itemCategory(id))
                }
            }
            .navigationDestination(for: TagsRoute.self) { _ in
                TagsPickerView(options: model.tags, selection: $model.draft.tags)
            }
            .task { await load() }
        }
    }

    /// The category of one item, by its id, for the picker.
    private func itemCategory(_ id: UUID) -> Binding<String> {
        Binding(
            get: { model.draft.items.first { $0.id == id }?.category ?? "" },
            set: { name in
                guard let index = model.draft.items.firstIndex(where: { $0.id == id }) else { return }
                model.draft.items[index].category = name
            }
        )
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

    private func close() {
        // the transaction was made even though some of its files were not
        if model.filesPendingFor != nil { onSaved() }
        dismiss()
    }

    private func saveAndAddAnother() {
        Task {
            guard let api = session.api, await model.saveAndAddAnother(using: api) else { return }
            onSaved()
        }
    }

    private func saveTemplate(named name: String) async -> String? {
        guard let api = session.api else { return "Something went wrong." }
        return await model.saveTemplate(named: name, using: api)
    }
}

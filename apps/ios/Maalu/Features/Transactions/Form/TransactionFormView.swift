import SwiftUI

struct TransactionFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: TransactionFormModel
    @State private var isPickingTemplate = false
    @State private var isSavingTemplate = false
    private let onSaved: () -> Void

    init(editing transaction: Transaction? = nil, startingFrom template: TransactionTemplate? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: TransactionFormModel(editing: transaction, startingFrom: template))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                TransactionTypeSection(model: model)
                TransactionAccountSection(model: model)
                if model.draft.type != .transfer {
                    TransactionDetailsSection(model: model)
                }
                TransactionDateSection(model: model)
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isLoading { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Transaction" : "New Transaction")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .primaryAction) {
                    if !model.isEditing {
                        Menu("Template", systemImage: "bookmark") {
                            if !model.templates.isEmpty {
                                Button("Start from a template", systemImage: "bookmark") { isPickingTemplate = true }
                            }
                            Button("Save as template", systemImage: "bookmark.fill") { isSavingTemplate = true }
                        }
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!model.canSave)
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

    private func saveTemplate(named name: String) async -> String? {
        guard let api = session.api else { return "Something went wrong." }
        return await model.saveTemplate(named: name, using: api)
    }
}

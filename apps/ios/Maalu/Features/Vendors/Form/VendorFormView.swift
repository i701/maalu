import SwiftUI

struct VendorFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: VendorFormModel
    private let onSaved: () -> Void

    init(editing vendor: Vendor? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: VendorFormModel(editing: vendor))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    TextField("Address", text: $model.draft.address, axis: .vertical)
                    TextField("Contact", text: $model.draft.contact)
                        .textContentType(.telephoneNumber)
                }
                Section {
                    Picker("Local or foreign", selection: $model.draft.isLocal) {
                        Text("Not set").tag(Bool?.none)
                        Text("Local").tag(Optional(true))
                        Text("Foreign").tag(Optional(false))
                    }
                    Picker("Currency", selection: $model.draft.currency) {
                        Text("None").tag("")
                        ForEach(model.currencies, id: \.self) { code in
                            Text(code).tag(code)
                        }
                    }
                }
                Section {
                    NavigationLink {
                        NamePickerView(title: "Usual category", options: model.categories, allowsNone: true, selection: $model.draft.defaultCategory)
                    } label: {
                        LabeledContent("Usual category", value: model.draft.defaultCategory.isEmpty ? String(localized: "None") : model.draft.defaultCategory)
                    }
                    NavigationLink {
                        TagsPickerView(options: model.tags, selection: $model.draft.defaultTags)
                    } label: {
                        LabeledContent("Usual tags", value: model.draft.defaultTags.isEmpty ? String(localized: "None") : model.draft.defaultTags.formatted())
                    }
                } footer: {
                    Text("Filled in when you pick this vendor on a new transaction.")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isSaving { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Vendor" : "New Vendor")
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

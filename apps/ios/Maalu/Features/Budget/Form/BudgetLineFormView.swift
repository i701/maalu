import SwiftUI

struct BudgetLineFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: BudgetLineFormModel
    private let currency: String
    private let onSaved: () -> Void

    init(editing line: BudgetLine? = nil, otherLines: [BudgetLine], currency: String, onSaved: @escaping () -> Void) {
        _model = State(initialValue: BudgetLineFormModel(editing: line, otherLines: otherLines))
        self.currency = currency
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    DecimalField("Limit per month in \(currency)", value: $model.draft.amount)
                }
                Section {
                    NavigationLink {
                        CategoryChoiceView(model: model, selection: $model.draft.categoryIDs)
                    } label: {
                        LabeledContent("Categories", value: model.draft.categoryIDs.isEmpty ? String(localized: "Choose") : model.selectedNames)
                    }
                }
                Section {
                    Toggle("Carry unspent money over", isOn: $model.draft.rollover)
                } footer: {
                    Text("What is not spent in a month is added to the next month's limit.")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isLoading { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Limit" : "New Limit")
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

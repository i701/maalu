import SwiftUI

struct TransactionFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: TransactionFormModel
    private let onSaved: () -> Void

    init(editing transaction: Transaction? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: TransactionFormModel(editing: transaction))
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
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(!model.canSave)
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
}

import SwiftUI

struct SubscriptionFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: SubscriptionFormModel
    private let onSaved: () -> Void

    init(editing subscription: Subscription? = nil, onSaved: @escaping () -> Void) {
        _model = State(initialValue: SubscriptionFormModel(editing: subscription))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                SubscriptionBasicsSection(model: model)
                SubscriptionDetailsSection(model: model)
                SubscriptionScheduleSection(model: model)
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.isLoading { ProgressView() } }
            .navigationTitle(model.isEditing ? "Edit Subscription" : "New Subscription")
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

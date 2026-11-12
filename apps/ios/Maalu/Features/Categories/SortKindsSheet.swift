import SwiftUI

/// Sort every category into need or want at once (or only the ones not sorted yet).
struct SortKindsSheet: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: SortKindsModel
    private let onSaved: () -> Void

    init(categories: [Category], onSaved: @escaping () -> Void) {
        _model = State(initialValue: SortKindsModel(categories: categories))
        self.onSaved = onSaved
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Toggle("Only the ones not sorted yet", isOn: $model.onlyUnsorted)
                } footer: {
                    Text("A need is something you cannot go without, a want is everything else. Spending is judged against 50/30/20 from these.")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                Section {
                    ForEach($model.choices) { $choice in
                        if !model.onlyUnsorted || choice.category.effectiveKind == nil {
                            VStack(alignment: .leading) {
                                Text(choice.category.path)
                                Picker("Kind", selection: $choice.kind) {
                                    Text("Not sorted").tag(CategoryKind?.none)
                                    ForEach(CategoryKind.allCases) { kind in
                                        Text(String(localized: kind.title)).tag(Optional(kind))
                                    }
                                }
                                .pickerStyle(.segmented)
                            }
                        }
                    }
                }
            }
            .overlay { if model.isSaving { ProgressView() } }
            .navigationTitle("Needs and wants")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save", action: save).disabled(model.changedCount == 0 || model.isSaving)
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

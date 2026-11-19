import SwiftUI

struct BudgetLineFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: BudgetLineFormModel
    private let currency: String
    private let onSaved: () -> Void

    /// A new limit, or with `editingID` a change to the limit the draft was filled from.
    init(draft: BudgetLineDraft = BudgetLineDraft(), editingID: String? = nil, budget: Budget, onSaved: @escaping () -> Void) {
        _model = State(initialValue: BudgetLineFormModel(draft: draft, editingID: editingID, budget: budget))
        currency = budget.currency
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    if model.draft.isOneTotal {
                        DecimalField("Limit for these dates in \(currency)", value: $model.draft.amount)
                    } else {
                        DecimalField("Limit per month in \(currency)", value: $model.draft.amount)
                    }
                }
                Section {
                    NavigationLink {
                        CategoryChoiceView(model: model, selection: $model.draft.categoryIDs)
                    } label: {
                        LabeledContent("Categories", value: model.draft.categoryIDs.isEmpty ? String(localized: "Choose") : model.selectedNames)
                    }
                }
                Section {
                    Toggle("Only for certain dates", isOn: $model.draft.hasDates)
                    if model.draft.hasDates {
                        DatePicker("From", selection: $model.pickerStart, displayedComponents: .date)
                        DatePicker("Until", selection: $model.pickerEnd, in: model.pickerStart..., displayedComponents: .date)
                        Picker("How it counts", selection: $model.draft.repeats) {
                            Text("One total for these dates").tag(false)
                            Text("Every month between them").tag(true)
                        }
                    }
                } footer: {
                    if model.draft.isOneTotal {
                        Text("The amount is the most to spend between the two dates, counted once.")
                    } else if model.draft.hasDates {
                        Text("The limit applies in every month the dates touch, as whole months.")
                    }
                }
                if !model.draft.isOneTotal {
                    Section {
                        Toggle("Carry unspent money over", isOn: $model.draft.rollover)
                    } footer: {
                        Text("What is not spent in a month is added to the next month's limit.")
                    }
                }
                Section {
                    Toggle("Own warning level", isOn: $model.hasOwnWarnLevel)
                    if model.hasOwnWarnLevel {
                        LabeledContent("Warn at", value: "\(model.ownWarnPercent)%")
                        Slider(value: $model.ownWarnLevel, in: 1...100) { Text("Warn at") }
                            .accessibilityValue("\(model.ownWarnPercent)%")
                    }
                } footer: {
                    Text("Otherwise it warns at the budget's level, \(model.budgetWarnPercent)%.")
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

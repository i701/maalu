import SwiftUI

/// Giving money back for a purchase (or changing a refund). It is in the purchase's currency and category, and can be up to what is left of it.
struct RefundFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: RefundFormModel
    let onSaved: () -> Void

    init(purchase: Transaction, onSaved: @escaping () -> Void) {
        _model = State(initialValue: RefundFormModel(purchase: purchase))
        self.onSaved = onSaved
    }

    init(refund: Transaction, onSaved: @escaping () -> Void) {
        _model = State(initialValue: RefundFormModel(refund: refund))
        self.onSaved = onSaved
    }

    var body: some View {
        @Bindable var model = model
        NavigationStack {
            Form {
                Section {
                    Text(model.context).foregroundStyle(.secondary)
                }
                Section {
                    if model.draft.hasItems {
                        RefundItemRows(items: $model.draft.items, currency: model.currency, isLocked: model.draft.isEditing)
                    } else {
                        DecimalField("Amount in \(model.currency)", value: $model.draft.amount)
                    }
                } header: {
                    Text(model.draft.hasItems ? "Items given back" : "Amount")
                } footer: {
                    if model.draft.hasItems {
                        Text("Refund total: \(MoneyFormat.string(model.draft.total ?? 0, currency: model.currency))")
                    } else if let left = model.draft.left {
                        Text("Up to \(MoneyFormat.string(left, currency: model.currency)) is left to refund.")
                    }
                }
                Section {
                    DatePicker("Date", selection: $model.draft.date, displayedComponents: .date)
                    Toggle("Time of day", isOn: hasTime)
                    if let time = model.draft.time {
                        DatePicker("Time", selection: Binding(get: { time }, set: { model.draft.time = $0 }), displayedComponents: .hourAndMinute)
                    }
                    if model.isForeign {
                        DecimalField("Exchange rate to \(model.baseCurrency)", value: $model.draft.rate)
                    }
                } footer: {
                    if model.isForeign {
                        Text("Starts as the purchase's rate. Change it to the rate the refund really came in at.")
                    }
                }
                Section {
                    Picker("Account", selection: $model.draft.accountID) {
                        Text("None").tag(String?.none)
                        ForEach(model.usableAccounts) { Text($0.name).tag(String?.some($0.id)) }
                    }
                    TextField("Note (optional)", text: $model.draft.note, axis: .vertical)
                } footer: {
                    Text("The account the money went back to. Only accounts in \(model.currency) are offered.")
                }
                if let problem = model.draft.problem {
                    Text(problem).foregroundStyle(.secondary)
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .saving(model.isSaving)
            .navigationTitle(model.draft.isEditing ? "Edit refund" : "Refund a purchase")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(model.isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton(model.draft.isEditing ? "Save" : "Refund", isSaving: model.isSaving, isEnabled: model.canSave, action: save)
                }
            }
            .task {
                guard let api = session.api else { return }
                await model.load(using: api)
            }
        }
    }

    private var hasTime: Binding<Bool> {
        Binding(get: { model.draft.time != nil }, set: { model.draft.time = $0 ? (model.draft.time ?? .now) : nil })
    }

    private func save() {
        Task {
            guard let api = session.api else { return }
            if await model.save(using: api) {
                onSaved()
                dismiss()
            }
        }
    }
}

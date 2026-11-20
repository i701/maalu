import SwiftUI

/// Add what one account or goal gets when a salary is split, or change how much a rule sends.
struct SalaryRuleFormView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var draft: SalaryRuleDraft
    @State private var isSaving = false
    @State private var errorMessage: String?
    let model: SalaryRulesModel
    let rule: SalaryRule?
    let onSaved: () async -> Void

    init(model: SalaryRulesModel, editing rule: SalaryRule? = nil, onSaved: @escaping () async -> Void) {
        self.model = model
        self.rule = rule
        self.onSaved = onSaved
        _draft = State(initialValue: rule.map(SalaryRuleDraft.init(editing:)) ?? SalaryRuleDraft())
    }

    var body: some View {
        NavigationStack {
            Form {
                if draft.isNew {
                    Section {
                        Picker("Send it to", selection: $draft.target) {
                            ForEach(SalaryRuleDraft.Target.allCases) { Text($0.title).tag($0) }
                        }
                        .pickerStyle(.segmented)
                        .onChange(of: draft.target) { draft.targetID = nil }
                        Picker(draft.target == .account ? "Account" : "Goal", selection: $draft.targetID) {
                            Text("Choose").tag(String?.none)
                            ForEach(model.choices(for: draft.target), id: \.id) { Text($0.name).tag(String?.some($0.id)) }
                        }
                    } footer: {
                        Text(draft.target == .account
                            ? "The money is moved there from the account the salary arrives in."
                            : "A goal that follows an account moves the money there; one you track by hand gets an amount set aside.")
                    }
                }
                Section {
                    Picker("How much", selection: $draft.mode) {
                        ForEach(SalaryRuleMode.allCases) { Text($0.title).tag($0) }
                    }
                    DecimalField(draft.mode == .percent ? "Percent of the salary" : "Amount", value: $draft.value)
                } footer: {
                    Text(draft.mode == .percent ? "For example 10 for a tenth of each salary." : "In the currency of the salary.")
                }
                Section {
                    Toggle("Move it automatically", isOn: $draft.auto)
                } footer: {
                    Text(draft.auto ? "Made as soon as a salary is posted, without asking." : "Off: it waits for your approval on the Pending screen.")
                }
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                }
            }
            .saving(isSaving)
            .navigationTitle(rule.map { "Rule for \($0.targetName)" } ?? "Add a rule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton(isSaving: isSaving, isEnabled: draft.problem == nil, action: save)
                }
            }
        }
    }

    private func save() {
        Task {
            guard let api = session.api else { return }
            isSaving = true
            errorMessage = nil
            let result: ApiResult<SalaryRule> = if let rule {
                await api.patchJSON("salary-rules/\(rule.id)", body: draft.request)
            } else {
                await api.postJSON("salary-rules", body: draft.request)
            }
            isSaving = false
            if case .failed(_, let message) = result {
                errorMessage = message
            } else {
                await onSaved()
                dismiss()
            }
        }
    }
}

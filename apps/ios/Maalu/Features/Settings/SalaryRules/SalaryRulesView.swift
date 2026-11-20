import SwiftUI

/// What each account or goal gets when a salary is split. Nothing happens by itself: a salary's split waits for approval unless its rule moves automatically.
struct SalaryRulesView: View {
    @Environment(Session.self) private var session
    @State private var model = SalaryRulesModel()
    @State private var editing: SalaryRule?
    @State private var isAdding = false
    @State private var deleting: SalaryRule?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.rules) { rule in
                    SalaryRuleRow(rule: rule, currency: model.baseCurrency)
                        .swipeActions(edge: .trailing) {
                            Button("Delete", systemImage: "trash", role: .destructive) {
                                deleting = rule
                                isConfirmingDelete = true
                            }
                            Button("Change", systemImage: "pencil") { editing = rule }
                        }
                }
            } header: {
                Text("When my salary arrives")
            } footer: {
                if model.rules.isEmpty {
                    Text("No rules yet. Choose how much of each salary goes to which account or goal.")
                } else {
                    Text("Together: \(model.summary). The rest stays where the salary arrives.")
                }
            }
        }
        .overlay { if model.isLoading { ProgressView() } }
        .navigationTitle("Salary split")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add rule", systemImage: "plus") { isAdding = true }
            }
        }
        .refreshable { await load() }
        .task { await load() }
        .sheet(isPresented: $isAdding) {
            SalaryRuleFormView(model: model, onSaved: load)
        }
        .sheet(item: $editing) { rule in
            SalaryRuleFormView(model: model, editing: rule, onSaved: load)
        }
        .confirmationDialog("Delete this rule?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: delete)
        } message: {
            Text("Stop sending part of each salary to \(deleting?.targetName ?? ""). Splits you already made are not changed.")
        }
        .alert("Could not delete", item: $errorMessage) { _ in
        } message: { message in
            Text(message)
        }
    }

    private func delete() {
        guard let rule = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.delete(rule, using: api)
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}

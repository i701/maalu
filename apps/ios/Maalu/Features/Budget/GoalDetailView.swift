import SwiftUI

struct GoalDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: BudgetModel
    let id: String
    @State private var sheet: GoalSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let goal = model.goal(id: id) {
            List {
                Section { GoalRow(goal: goal) }
                GoalFactsSection(goal: goal)
                if goal.account == nil {
                    Section {
                        Button("Add or take out money", systemImage: "plusminus") { sheet = .money(goal) }
                            .buttonStyle(.borderless)
                    }
                }
            }
            .navigationTitle(goal.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit", systemImage: "pencil") { sheet = .edit(goal) }
                }
                ToolbarItem {
                    Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
                        .confirmationDialog("Delete this goal?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                            Button("Delete", role: .destructive, action: delete)
                        } message: {
                            Text("An account it follows is not changed.")
                        }
                }
            }
            .sheet(item: $sheet) { sheet in
                switch sheet {
                case .edit(let goal): GoalFormView(editing: goal, currency: goal.currency, onSaved: reload)
                case .money(let goal): GoalMoneyView(goal: goal, onSaved: reload)
                }
            }
            .alert("Could not delete", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        } else {
            ContentUnavailableView("Goal not found", systemImage: "questionmark.circle")
        }
    }

    private func reload() {
        Task {
            guard let api = session.api else { return }
            await model.load(using: api)
        }
    }

    private func delete() {
        Task {
            guard let api = session.api else { return }
            if let message = await model.deleteGoal(id: id, using: api) {
                errorMessage = message
            } else {
                dismiss()
            }
        }
    }
}

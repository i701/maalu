import SwiftUI

struct FixedBudgetLineDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: BudgetModel
    let id: String
    @State private var sheet: FixedLineSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let line = model.fixedLine(id: id), let budget = model.budget {
            List {
                Section { FixedBudgetLineRow(line: line, currency: budget.currency) }
                FixedBudgetLineFactsSection(line: line, currency: budget.currency)
                if line.state != "upcoming" {
                    Section {
                        Button("Repeat for the Next Stretch", systemImage: "arrow.clockwise") { sheet = .repeatNext(line) }
                    } footer: {
                        Text("A new limit with the same categories and amount, starting the day after this one ends and as long.")
                    }
                }
            }
            .navigationTitle(line.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit", systemImage: "pencil") { sheet = .edit(line) }
                }
                ToolbarItem {
                    Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
                        .confirmationDialog("Delete this limit?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                            Button("Delete", role: .destructive, action: delete)
                        } message: {
                            Text("Your transactions are not changed.")
                        }
                }
            }
            .sheet(item: $sheet) { sheet in
                Group {
                    switch sheet {
                    case .edit(let line):
                        BudgetLineFormView(draft: BudgetLineDraft(editing: line), editingID: line.id, budget: budget, onSaved: reload)
                    case .repeatNext(let line):
                        BudgetLineFormView(draft: BudgetLineDraft(repeating: line), budget: budget, onSaved: reload)
                    }
                }
                .accentTint(.accentAmber)
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        } else {
            ContentUnavailableView("Limit not found", systemImage: "questionmark.circle")
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
            if let message = await model.deleteLine(id: id, using: api) {
                errorMessage = message
            } else {
                dismiss()
            }
        }
    }
}

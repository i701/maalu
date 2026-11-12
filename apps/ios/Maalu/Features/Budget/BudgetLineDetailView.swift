import SwiftUI

struct BudgetLineDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let model: BudgetModel
    let id: String
    @State private var sheet: LineSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let line = model.line(id: id), let budget = model.budget {
            List {
                Section { BudgetLineRow(line: line, currency: budget.currency) }
                BudgetLineFactsSection(line: line, currency: budget.currency)
                LineMovesSection(
                    moves: model.moves(for: id),
                    line: line,
                    currency: budget.currency,
                    onMove: { sheet = .move(line) },
                    onUndo: undo
                )
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
                switch sheet {
                case .edit(let line):
                    BudgetLineFormView(editing: line, otherLines: budget.lines, currency: budget.currency, onSaved: reload)
                case .move(let line):
                    MoveMoneyView(line: line, budget: budget, period: model.month.start, onSaved: reload)
                }
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

    private func undo(_ moveID: String) {
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.undoMove(id: moveID, using: api)
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

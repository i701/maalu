import SwiftUI

struct LineMovesSection: View {
    let moves: [LineMove]
    let line: BudgetLine
    let currency: String
    let onMove: () -> Void
    let onUndo: (String) -> Void

    var body: some View {
        Section("Money moved this period") {
            ForEach(moves) { move in
                AmountRow {
                    VStack(alignment: .leading) {
                        Text(move.text)
                        if let note = move.note, !note.isEmpty {
                            Text(note).font(.subheadline).foregroundStyle(.secondary)
                        }
                    }
                } amount: {
                    Button("Undo") { onUndo(move.id) }
                        .buttonStyle(.borderless)
                }
            }
            Button("Move money here", systemImage: "arrow.left.arrow.right", action: onMove)
                .buttonStyle(.borderless)
            NavigationLink {
                MoveHistoryView(line: line, currency: currency)
            } label: {
                Label("History", systemImage: "clock.arrow.circlepath")
            }
        }
    }
}

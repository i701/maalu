import SwiftUI

struct MoveHistoryView: View {
    @Environment(Session.self) private var session
    @State private var model = MoveHistoryModel()
    let line: BudgetLine
    let currency: String

    var body: some View {
        List {
            ForEach(model.periods) { period in
                Section(period.header) {
                    ForEach(period.moves) { move in
                        MoveHistoryRow(move: move, lineID: line.id, currency: currency)
                    }
                }
            }
        }
        .overlay {
            if model.isLoading {
                ProgressView()
            } else if let message = model.errorMessage {
                ContentUnavailableView("Could not load the history", systemImage: "exclamationmark.triangle", description: Text(message))
            } else if model.periods.isEmpty {
                ContentUnavailableView("No money moved yet", systemImage: "arrow.left.arrow.right")
            }
        }
        .navigationTitle("Money moved")
        .navigationBarTitleDisplayMode(.inline)
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(lineID: line.id, using: api)
    }
}

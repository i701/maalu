import SwiftUI

struct TransactionsPlaceholder: View {
    let model: TransactionsModel
    let retry: () -> Void

    var body: some View {
        if model.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if let message = model.errorMessage {
                ContentUnavailableView {
                    Label("Could not load transactions", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(message)
                } actions: {
                    Button("Try again", action: retry)
                }
            } else if !model.filter.text.isEmpty {
                ContentUnavailableView.search
            } else if model.filter.isActive {
                ContentUnavailableView("No matching transactions", systemImage: "line.3.horizontal.decrease")
            } else {
                ContentUnavailableView("No transactions yet", systemImage: "list.bullet.rectangle")
            }
        }
    }
}

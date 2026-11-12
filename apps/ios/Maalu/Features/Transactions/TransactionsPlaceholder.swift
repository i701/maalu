import SwiftUI

struct TransactionsPlaceholder: View {
    let model: TransactionsModel
    let retry: () -> Void
    let clearFilters: () -> Void

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
                ContentUnavailableView {
                    Label("No matching transactions", systemImage: "line.3.horizontal.decrease")
                } actions: {
                    Button("Clear filters", action: clearFilters)
                }
            } else {
                ContentUnavailableView("No transactions yet", systemImage: "list.bullet.rectangle")
            }
        }
    }
}

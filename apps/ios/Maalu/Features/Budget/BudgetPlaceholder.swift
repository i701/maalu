import SwiftUI

struct BudgetPlaceholder: View {
    let model: BudgetModel
    let retry: () -> Void

    var body: some View {
        if model.budget == nil {
            if model.isLoading {
                ProgressView()
            } else if let message = model.errorMessage {
                ContentUnavailableView {
                    Label("Could not load the budget", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(message)
                } actions: {
                    Button("Try again", action: retry)
                }
            }
        }
    }
}

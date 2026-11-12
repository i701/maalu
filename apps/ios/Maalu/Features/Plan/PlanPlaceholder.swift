import SwiftUI

struct PlanPlaceholder: View {
    let model: PlanModel
    let retry: () -> Void

    var body: some View {
        if model.available == nil {
            if model.isLoading {
                ProgressView()
            } else {
                ContentUnavailableView {
                    Label("Could not load the plan", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(model.errorMessage ?? "")
                } actions: {
                    Button("Try again", action: retry)
                }
            }
        }
    }
}

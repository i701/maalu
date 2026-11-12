import SwiftUI

struct DashboardPlaceholder: View {
    let model: DashboardModel
    let retry: () -> Void

    var body: some View {
        if !model.hasContent {
            if model.isLoading {
                ProgressView()
            } else {
                ContentUnavailableView {
                    Label("Could not load the dashboard", systemImage: "exclamationmark.triangle")
                } description: {
                    Text(model.errorMessage ?? "")
                } actions: {
                    Button("Try again", action: retry)
                }
            }
        }
    }
}

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
        } else if model.orderedSections.isEmpty {
            ContentUnavailableView(
                "Every card is switched off",
                systemImage: "eye.slash",
                description: Text("Switch some back on from the menu, under Arrange the dashboard.")
            )
        }
    }
}

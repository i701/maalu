import SwiftUI

struct SubscriptionsPlaceholder: View {
    let model: SubscriptionsModel

    var body: some View {
        if model.subscriptions.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No subscriptions yet", systemImage: "repeat", description: Text("Add a bill that repeats, like rent or a streaming service."))
            }
        } else if model.visible.isEmpty {
            ContentUnavailableView.search
        }
    }
}

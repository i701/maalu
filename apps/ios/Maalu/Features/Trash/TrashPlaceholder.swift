import SwiftUI

struct TrashPlaceholder: View {
    let model: TrashModel

    var body: some View {
        if model.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("The trash is empty", systemImage: "trash", description: Text("Deleted transactions wait here until you restore them or delete them for good."))
            }
        }
    }
}

import SwiftUI

struct TagsPlaceholder: View {
    let model: TagsModel

    var body: some View {
        if model.tags.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No tags yet", systemImage: "tag", description: Text("They are created as you type them on a transaction."))
            }
        } else if model.visible.isEmpty {
            ContentUnavailableView.search
        }
    }
}

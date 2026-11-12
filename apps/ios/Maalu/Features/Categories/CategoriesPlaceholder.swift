import SwiftUI

struct CategoriesPlaceholder: View {
    let model: CategoriesModel

    var body: some View {
        if model.categories.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No categories yet", systemImage: "folder", description: Text("They are created as you type them on a transaction."))
            }
        } else if model.visible.isEmpty {
            ContentUnavailableView.search
        }
    }
}

import SwiftUI

struct VendorsPlaceholder: View {
    let model: VendorsModel

    var body: some View {
        if model.vendors.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No vendors yet", systemImage: "storefront", description: Text("They are created as you type them on a transaction."))
            }
        } else if model.visible.isEmpty {
            ContentUnavailableView.search
        }
    }
}

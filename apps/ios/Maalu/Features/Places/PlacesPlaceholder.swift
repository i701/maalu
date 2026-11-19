import SwiftUI

struct PlacesPlaceholder: View {
    let model: PlacesModel

    var body: some View {
        if model.places.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No places yet", systemImage: "map", description: Text("Spending shows here once purchases are marked on the map."))
            }
        }
    }
}

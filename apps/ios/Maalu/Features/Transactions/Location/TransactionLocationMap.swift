import SwiftUI

/// Where a transaction was marked: a small still map and the spot's name.
struct TransactionLocationMap: View {
    let location: TransactionLocation
    @State private var isFullScreen = false

    var body: some View {
        Section("Location") {
            LocationPreviewMap(location: location, isInteractive: false, isFullScreen: $isFullScreen)
                .frame(height: 180)
                .listRowInsets(EdgeInsets())
                // on the Section a List repeats the cover for every row, and presenting it closes the sheet
                .fullScreenCover(isPresented: $isFullScreen) {
                    LocationPreviewMap(location: location, isInteractive: true, isFullScreen: $isFullScreen)
                        .ignoresSafeArea(edges: .bottom)
                }
            LabeledContent(location.place.isEmpty ? "Coordinates" : location.place, value: location.coordinates)
        }
    }
}

import MapKit
import SwiftUI

/// Where a transaction was marked: a small still map and the spot's name.
struct TransactionLocationMap: View {
    let location: TransactionLocation

    var body: some View {
        Section("Location") {
            Map(initialPosition: .region(MKCoordinateRegion(center: location.coordinate, latitudinalMeters: 500, longitudinalMeters: 500)), interactionModes: []) {
                Marker(location.label, coordinate: location.coordinate)
            }
            .frame(height: 160)
            .listRowInsets(EdgeInsets())
            .accessibilityLabel("Map of \(location.label)")
            LabeledContent(location.place.isEmpty ? "Coordinates" : location.place, value: location.coordinates)
        }
    }
}

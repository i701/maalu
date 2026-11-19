import MapKit
import SwiftUI

/// A transaction's spot on the map: still on its screen, movable full screen.
struct LocationPreviewMap: View {
    let location: TransactionLocation
    let isInteractive: Bool
    @Binding var isFullScreen: Bool
    @AppStorage(MapLook.key) private var look = MapLook.map

    var body: some View {
        Map(initialPosition: .region(MKCoordinateRegion(center: location.coordinate, latitudinalMeters: 500, longitudinalMeters: 500)),
            interactionModes: isInteractive ? .all : []) {
            Marker(location.label, coordinate: location.coordinate)
        }
        .mapStyle(look.style)
        .overlay(alignment: .topTrailing) { MapButtons(isFullScreen: $isFullScreen) }
        .accessibilityLabel("Map of \(location.label)")
    }
}

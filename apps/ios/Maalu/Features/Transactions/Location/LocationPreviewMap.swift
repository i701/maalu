import MapKit
import SwiftUI

/// A transaction's spot on the map: still on its screen, movable full screen.
struct LocationPreviewMap: View {
    let location: TransactionLocation
    let isInteractive: Bool
    @Binding var isFullScreen: Bool
    @AppStorage(MapLook.key) private var look = MapLook.map
    @State private var position: MapCameraPosition

    init(location: TransactionLocation, isInteractive: Bool, isFullScreen: Binding<Bool>) {
        self.location = location
        self.isInteractive = isInteractive
        _isFullScreen = isFullScreen
        _position = State(initialValue: .region(MKCoordinateRegion(center: location.coordinate, latitudinalMeters: 500, longitudinalMeters: 500)))
    }

    var body: some View {
        Map(position: $position, interactionModes: isInteractive ? .all : []) {
            Marker(location.label, coordinate: location.coordinate)
        }
        .mapStyle(look.style)
        // a marker goes missing when the style is changed under it, so a new look gets a new map (the camera is kept)
        .id(look)
        .overlay(alignment: .topTrailing) { MapButtons(isFullScreen: $isFullScreen) }
        .accessibilityLabel("Map of \(location.label)")
    }
}

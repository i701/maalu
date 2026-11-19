import MapKit
import SwiftUI

/// The picker's map: a tap puts the pin there. The same map is shown full screen.
struct LocationPickMap: View {
    let model: LocationPickerModel
    @Binding var position: MapCameraPosition
    @Binding var center: CLLocationCoordinate2D?
    @Binding var isFullScreen: Bool
    @AppStorage(MapLook.key) private var look = MapLook.map

    var body: some View {
        MapReader { proxy in
            Map(position: $position) {
                if let location = model.location {
                    Marker(location.label, coordinate: location.coordinate)
                }
            }
            .mapStyle(look.style)
            .onTapGesture { point in drop(proxy.convert(point, from: .local)) }
            .onMapCameraChange { context in center = context.region.center }
        }
        .overlay(alignment: .topTrailing) { MapButtons(isFullScreen: $isFullScreen) }
    }

    private func drop(_ coordinate: CLLocationCoordinate2D?) {
        guard let coordinate else { return }
        model.drop(at: coordinate)
    }
}

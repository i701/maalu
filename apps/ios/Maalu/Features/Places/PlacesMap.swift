import MapKit
import SwiftUI

/// A circle per spot, sized by what was spent there. A circle keeps its size on screen however far the map is zoomed.
struct PlacesMap: View {
    let model: PlacesModel
    @Binding var position: MapCameraPosition
    let onSelect: (PlaceTotal) -> Void

    var body: some View {
        Map(position: $position) {
            ForEach(model.places) { place in
                Annotation(place.label, coordinate: place.coordinate, anchor: .center) {
                    Button { onSelect(place) } label: {
                        let isSelected = place.id == model.selectedID
                        Circle()
                            .fill(Color.red.opacity(isSelected ? 0.7 : 0.35))
                            .stroke(isSelected ? Color.primary : Color.red, lineWidth: isSelected ? 2 : 1)
                            .frame(width: model.diameter(of: place), height: model.diameter(of: place))
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("\(place.label), \(MoneyFormat.string(place.spentValue, currency: model.currency))")
                }
                .annotationTitles(.hidden)
            }
        }
        .mapControls {
            MapCompass()
            MapScaleView()
        }
    }
}

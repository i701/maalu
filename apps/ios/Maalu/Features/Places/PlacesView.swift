import MapKit
import SwiftUI

/// Where spending went: expenses marked with a location, grouped by spot, on Apple's map.
struct PlacesView: View {
    @Environment(Session.self) private var session
    @State private var model = PlacesModel()
    @State private var position = MapCameraPosition.automatic
    @State private var isFullScreen = false

    var body: some View {
        @Bindable var model = model
        List {
            Section {
                Picker("Range", selection: $model.range) {
                    ForEach(PlaceRange.allCases) { range in
                        Text(range.title).tag(range)
                    }
                }
                .pickerStyle(.segmented)
            }
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if !model.places.isEmpty {
                Section {
                    PlacesMap(model: model, position: $position, isFullScreen: $isFullScreen, onSelect: select)
                        .frame(height: 320)
                        .listRowInsets(EdgeInsets())
                } footer: {
                    Text("Each circle is a spot, sized by what was spent there. Tap one, or a spot below, to find it.")
                }
                Section("Spots") {
                    ForEach(model.places) { place in
                        Button { select(place) } label: {
                            PlaceRow(place: place, currency: model.currency, isSelected: place.id == model.selectedID)
                                .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .overlay { PlacesPlaceholder(model: model) }
        .fullScreenCover(isPresented: $isFullScreen) {
            PlacesMap(model: model, position: $position, isFullScreen: $isFullScreen, onSelect: select)
                .ignoresSafeArea(edges: .bottom)
        }
        .navigationTitle("Places")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: model.range) { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
        position = .automatic
    }

    private func select(_ place: PlaceTotal) {
        model.selectedID = place.id
        withAnimation {
            position = .region(MKCoordinateRegion(center: place.coordinate, latitudinalMeters: 600, longitudinalMeters: 600))
        }
    }
}

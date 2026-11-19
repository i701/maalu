import MapKit
import SwiftUI

/// Where a transaction happened: tap the map, use Where I Am, type the coordinates, or search for a place by name. Saving with no pin removes the location.
struct LocationPickerView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: LocationPickerModel
    @State private var position: MapCameraPosition
    @State private var center: CLLocationCoordinate2D?
    private let onSave: (TransactionLocation?) -> Void

    init(location: TransactionLocation?, onSave: @escaping (TransactionLocation?) -> Void) {
        _model = State(initialValue: LocationPickerModel(location: location))
        _position = State(initialValue: .region(MKCoordinateRegion(
            center: location?.coordinate ?? TransactionLocation.defaultCenter,
            latitudinalMeters: location == nil ? 4000 : 600,
            longitudinalMeters: location == nil ? 4000 : 600
        )))
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    MapReader { proxy in
                        Map(position: $position) {
                            if let location = model.location {
                                Marker(location.label, coordinate: location.coordinate)
                            }
                        }
                        .onTapGesture { point in drop(proxy.convert(point, from: .local)) }
                        .onMapCameraChange { context in center = context.region.center }
                    }
                    .frame(height: 300)
                    .listRowInsets(EdgeInsets())
                } footer: {
                    Text("Tap the map to put the pin there.")
                }
                Section {
                    Button(model.isLocating ? "Finding You…" : "Where I Am", systemImage: "location", action: locate)
                        .disabled(model.isLocating)
                    TextField("Coordinates, like 4.1755, 73.5093", text: $model.typedCoordinates)
                        .keyboardType(.numbersAndPunctuation)
                        .autocorrectionDisabled()
                        .onSubmit(useTyped)
                }
                if model.location != nil {
                    Section {
                        TextField("Place name (optional)", text: $model.placeName)
                    } footer: {
                        Text("Spots with the same name group together on the Places map.")
                    }
                }
                LocationSearchSection(model: model, onSearch: searchPlaces, onChoose: choose)
                if let message = model.message {
                    Text(message).foregroundStyle(.red)
                }
                if model.location != nil {
                    Button("Remove Location", systemImage: "mappin.slash", role: .destructive, action: model.remove)
                }
            }
            .navigationTitle("Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done", action: save)
                }
            }
        }
    }

    private func focus(on coordinate: CLLocationCoordinate2D) {
        withAnimation {
            position = .region(MKCoordinateRegion(center: coordinate, latitudinalMeters: 600, longitudinalMeters: 600))
        }
    }

    private func drop(_ coordinate: CLLocationCoordinate2D?) {
        guard let coordinate else { return }
        model.drop(at: coordinate)
    }

    private func useTyped() {
        if let coordinate = model.useTyped() { focus(on: coordinate) }
    }

    private func locate() {
        Task {
            if let coordinate = await model.locate() { focus(on: coordinate) }
        }
    }

    private func searchPlaces() {
        Task {
            guard let api = session.api else { return }
            await model.searchPlaces(near: center, using: api)
        }
    }

    private func choose(_ hit: PlaceSearchHit) {
        model.choose(hit)
        focus(on: hit.coordinate)
    }

    private func save() {
        onSave(model.location)
        dismiss()
    }
}

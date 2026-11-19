import CoreLocation
import Foundation
import Observation

/// Marking where a transaction happened. Nothing is looked up by itself: only Search asks the server's geocoder, and only Where I Am asks the device.
@MainActor @Observable
final class LocationPickerModel {
    var location: TransactionLocation?
    var placeName: String {
        get { location?.place ?? "" }
        set { location?.place = newValue }
    }
    var typedCoordinates = ""
    var search = ""
    private(set) var results: [PlaceSearchHit] = []
    private(set) var isSearching = false
    private(set) var isLocating = false
    private(set) var message: String?

    init(location: TransactionLocation?) {
        self.location = location
        typedCoordinates = location?.coordinates ?? ""
    }

    /// Puts the pin there, keeping a name already typed.
    func drop(at coordinate: CLLocationCoordinate2D, naming name: String? = nil) {
        let typed = placeName.trimmingCharacters(in: .whitespaces)
        location = TransactionLocation(coordinate, place: typed.isEmpty ? name ?? "" : placeName)
        typedCoordinates = location?.coordinates ?? ""
        message = nil
    }

    /// Returns where the pin went, or nil when the text is not a pair of coordinates.
    func useTyped() -> CLLocationCoordinate2D? {
        guard let coordinate = TransactionLocation.parse(typedCoordinates) else {
            message = String(localized: "Type the coordinates as two numbers, like 4.1755, 73.5093.")
            return nil
        }
        drop(at: coordinate)
        return coordinate
    }

    func remove() {
        location = nil
        typedCoordinates = ""
    }

    func searchPlaces(near center: CLLocationCoordinate2D?, using api: Api) async {
        let typed = search.trimmingCharacters(in: .whitespaces)
        guard typed.count >= 2 else {
            message = String(localized: "Type at least two letters to search.")
            return
        }
        isSearching = true
        message = nil
        var query = [URLQueryItem(name: "q", value: typed), URLQueryItem(name: "limit", value: "5")]
        if let center {
            query += [URLQueryItem(name: "near_lat", value: String(center.latitude)), URLQueryItem(name: "near_lng", value: String(center.longitude))]
        }
        let result: ApiResult<PlaceSearchResults> = await api.get("places/search", query: query)
        isSearching = false
        switch result {
        case .ok(let found, _):
            results = found.results
            if found.results.isEmpty { message = String(localized: "Nothing found by that name.") }
        case .failed(let status, let message):
            results = []
            self.message = status == 404 ? String(localized: "Place search is not set up on this server. Drop the pin on the map instead.") : message
        }
    }

    func choose(_ hit: PlaceSearchHit) {
        drop(at: hit.coordinate, naming: hit.name)
        results = []
    }

    /// Asks the device once where it is; returns the spot, or nil when it could not tell or was not allowed to.
    func locate() async -> CLLocationCoordinate2D? {
        isLocating = true
        message = nil
        defer { isLocating = false }
        let permission = CLServiceSession(authorization: .whenInUse)
        defer { permission.invalidate() }
        do {
            for try await update in CLLocationUpdate.liveUpdates() {
                if let found = update.location {
                    drop(at: found.coordinate)
                    return found.coordinate
                }
                if update.authorizationDenied || update.authorizationDeniedGlobally || update.authorizationRestricted {
                    message = String(localized: "Maalu is not allowed to use your location. You can allow it in Settings, or drop the pin on the map.")
                    return nil
                }
            }
        } catch {
            message = String(localized: "Your location could not be found.")
        }
        return nil
    }
}

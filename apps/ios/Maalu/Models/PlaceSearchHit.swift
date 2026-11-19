import CoreLocation

/// A place found by name, through the server's geocoder.
struct PlaceSearchHit: Decodable, Identifiable, Hashable {
    let name: String
    let address: String
    let latitude: String
    let longitude: String

    var id: String { "\(latitude),\(longitude),\(name)" }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: Double(latitude) ?? 0, longitude: Double(longitude) ?? 0)
    }
}

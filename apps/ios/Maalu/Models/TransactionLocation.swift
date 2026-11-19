import CoreLocation
import Foundation

/// Where a transaction happened: a pin, as the API carries it (decimal strings, six decimals, about 10 cm), and an optional name.
struct TransactionLocation: Equatable {
    var latitude: String
    var longitude: String
    var place = ""

    init(latitude: String, longitude: String, place: String = "") {
        self.latitude = latitude
        self.longitude = longitude
        self.place = place
    }

    init(_ coordinate: CLLocationCoordinate2D, place: String = "") {
        self.init(latitude: Self.coordinate(coordinate.latitude), longitude: Self.coordinate(Self.wrapped(coordinate.longitude)), place: place)
    }

    /// Where the map starts when nothing is marked yet: Malé, as on the web.
    static let defaultCenter = CLLocationCoordinate2D(latitude: 4.1755, longitude: 73.5093)

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: Double(latitude) ?? 0, longitude: Double(longitude) ?? 0)
    }

    /// "4.1755, 73.5093": enough digits to tell two shops apart, few enough to read.
    var coordinates: String {
        let short = { (text: String) in (Double(text) ?? 0).formatted(.number.precision(.fractionLength(0...4)).grouping(.never)) }
        return "\(short(latitude)), \(short(longitude))"
    }

    /// Its name, else its coordinates.
    var label: String {
        let name = place.trimmingCharacters(in: .whitespaces)
        return name.isEmpty ? coordinates : name
    }

    /// "4.1755, 73.5093" as copied from a map app, or with a space; nil when it is not a pair of coordinates on the planet.
    static func parse(_ text: String) -> CLLocationCoordinate2D? {
        let parts = text.split { $0 == "," || $0 == ";" || $0.isWhitespace }.compactMap { Double($0) }
        guard parts.count == 2, abs(parts[0]) <= 90, abs(parts[1]) <= 180 else { return nil }
        return CLLocationCoordinate2D(latitude: parts[0], longitude: parts[1])
    }

    /// A coordinate as the API takes it: six decimals, no exponent.
    private static func coordinate(_ value: Double) -> String {
        value.formatted(.number.precision(.fractionLength(6)).grouping(.never).locale(Locale(identifier: "en_US_POSIX")))
    }

    /// Longitude as a map reports it can run past the edge when the world is scrolled round; fold it back into -180 to 180.
    private static func wrapped(_ longitude: Double) -> Double {
        (((longitude + 180).truncatingRemainder(dividingBy: 360)) + 360).truncatingRemainder(dividingBy: 360) - 180
    }
}

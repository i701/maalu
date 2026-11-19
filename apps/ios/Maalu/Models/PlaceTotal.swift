import CoreLocation
import Foundation

/// Spending at one spot: expenses marked within about 100 m of each other, in the base currency with refunds taken off.
struct PlaceTotal: Decodable, Identifiable, Hashable {
    let latitude: String
    let longitude: String
    let place: String?
    let count: Int
    let spent: String
    let lastDate: String

    var id: String { "\(latitude),\(longitude)" }
    var spentValue: Decimal { Money.decimal(spent) ?? 0 }

    var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: Double(latitude) ?? 0, longitude: Double(longitude) ?? 0)
    }

    /// Its name, else "4.1755, 73.5093": enough digits to tell two shops apart, few enough to read.
    var label: String {
        if let place, !place.isEmpty { return place }
        let short = { (text: String) in (Double(text) ?? 0).formatted(.number.precision(.fractionLength(0...4)).grouping(.never)) }
        return "\(short(latitude)), \(short(longitude))"
    }
}

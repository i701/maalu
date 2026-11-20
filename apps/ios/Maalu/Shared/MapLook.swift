import MapKit
import SwiftUI

/// How the maps are drawn: Apple's map, or the earth seen from above with labels on it. One choice for every map, remembered on the device.
enum MapLook: String {
    case map, earth

    static let key = "mapLook"

    var style: MapStyle {
        switch self {
        case .map: .standard(elevation: .realistic)
        case .earth: .hybrid
        }
    }

    var other: MapLook { self == .map ? .earth : .map }
}

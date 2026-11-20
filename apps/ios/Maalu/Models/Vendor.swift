import Foundation

/// A shop or payee. Its usual category, tags and place fill in a new transaction; the API never applies them itself.
struct Vendor: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let address: String?
    let contact: String?
    /// Local, foreign, or nil when not said.
    let isLocal: Bool?
    let currency: String?
    let defaultCategory: String?
    let defaultTags: [NamedRef]
    let latitude: String?
    let longitude: String?
    let place: String?

    /// Where it usually is, if a pin was marked.
    var location: TransactionLocation? {
        guard let latitude, let longitude else { return nil }
        return TransactionLocation(latitude: latitude, longitude: longitude, place: place ?? "")
    }
}

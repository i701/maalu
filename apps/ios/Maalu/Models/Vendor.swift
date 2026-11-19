import Foundation

/// A shop or payee. Its usual category and tags fill in a new transaction; the API never applies them itself.
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
}

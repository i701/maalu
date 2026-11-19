import Foundation

enum NameField: Hashable {
    case category
    case vendor
    /// The category of one item of a purchase split into items.
    case itemCategory(UUID)
}

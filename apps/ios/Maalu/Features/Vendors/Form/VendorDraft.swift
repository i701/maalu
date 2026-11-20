import Foundation

struct VendorDraft: Equatable {
    var name = ""
    var address = ""
    var contact = ""
    var isLocal: Bool?
    /// Empty for none.
    var currency = ""
    /// Empty for none.
    var defaultCategory = ""
    var defaultTags: [String] = []
    /// Where it usually is; nil for none.
    var location: TransactionLocation?

    init() {}

    init(editing vendor: Vendor) {
        name = vendor.name
        address = vendor.address ?? ""
        contact = vendor.contact ?? ""
        isLocal = vendor.isLocal
        currency = vendor.currency ?? ""
        defaultCategory = vendor.defaultCategory ?? ""
        defaultTags = vendor.defaultTags.map(\.name)
        location = vendor.location
    }

    var trimmedName: String { name.trimmingCharacters(in: .whitespaces) }

    /// Every field, so a cleared one is sent as null and cleared on the server too.
    var request: VendorRequest {
        func text(_ value: String) -> String? {
            let trimmed = value.trimmingCharacters(in: .whitespaces)
            return trimmed.isEmpty ? nil : trimmed
        }
        return VendorRequest(
            name: trimmedName,
            address: text(address),
            contact: text(contact),
            isLocal: isLocal,
            currency: text(currency),
            defaultCategory: text(defaultCategory),
            defaultTags: defaultTags,
            location: location
        )
    }
}

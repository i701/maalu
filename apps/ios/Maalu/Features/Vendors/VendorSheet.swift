enum VendorSheet: Identifiable {
    case add
    case edit(Vendor)

    var id: String {
        switch self {
        case .add: "add"
        case .edit(let vendor): "edit-\(vendor.id)"
        }
    }
}

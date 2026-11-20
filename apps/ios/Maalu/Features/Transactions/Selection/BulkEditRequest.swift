/// `PATCH /transactions/bulk`.
struct BulkEditRequest: Encodable {
    let ids: [String]
    let category: String?
    let vendorName: String?
    let paymentMethod: PaymentMethod?
    let addTags: [String]?
    let removeTags: [String]?

    private enum CodingKeys: String, CodingKey {
        case ids, category
        case vendorName = "vendor_name"
        case paymentMethod = "payment_method"
        case addTags = "add_tags"
        case removeTags = "remove_tags"
    }
}

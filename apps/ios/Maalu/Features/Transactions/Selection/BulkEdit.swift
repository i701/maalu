import Foundation

/// What to change on every selected transaction; whatever is empty is left as it is.
struct BulkEdit {
    var category = ""
    var vendor = ""
    var method: PaymentMethod?
    var addTags: [String] = []
    var removeTags: [String] = []

    var isEmpty: Bool {
        category.trimmingCharacters(in: .whitespaces).isEmpty && vendor.trimmingCharacters(in: .whitespaces).isEmpty
            && method == nil && addTags.isEmpty && removeTags.isEmpty
    }

    /// Only what was chosen is sent; the server skips what does not fit a transaction and says so.
    func request(ids: [String]) -> BulkEditRequest {
        let category = category.trimmingCharacters(in: .whitespaces)
        let vendor = vendor.trimmingCharacters(in: .whitespaces)
        return BulkEditRequest(
            ids: ids,
            category: category.isEmpty ? nil : category,
            vendorName: vendor.isEmpty ? nil : vendor,
            paymentMethod: method,
            addTags: addTags.isEmpty ? nil : addTags,
            removeTags: removeTags.isEmpty ? nil : removeTags
        )
    }
}

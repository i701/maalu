import Foundation
import Observation

@MainActor @Observable
final class VendorFormModel {
    var draft: VendorDraft
    private(set) var categories: [String] = []
    private(set) var tags: [String] = []
    private(set) var currencies: [String] = []
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Vendor?
    private let originalDraft: VendorDraft

    init(editing vendor: Vendor? = nil) {
        let start = vendor.map(VendorDraft.init(editing:)) ?? VendorDraft()
        original = vendor
        draft = start
        originalDraft = start
    }

    var isEditing: Bool { original != nil }
    var canSave: Bool { !draft.trimmedName.isEmpty && !isSaving && (!isEditing || draft != originalDraft) }

    func load(using api: Api) async {
        async let categoriesResult: ApiResult<[NamedRef]> = api.get("categories")
        async let tagsResult: ApiResult<[NamedRef]> = api.get("tags")
        async let currenciesResult: ApiResult<CurrencyList> = api.get("currencies")
        let (categories, tags, currencies) = await (categoriesResult, tagsResult, currenciesResult)
        guard !Task.isCancelled else { return }
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = tags { self.tags = list.map(\.name) }
        if case .ok(let list, _) = currencies { self.currencies = list.currencies }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Vendor>
        if let original {
            result = await api.patchJSON("vendors/\(original.id)", body: draft.request)
        } else {
            result = await api.postJSON("vendors", body: draft.request)
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

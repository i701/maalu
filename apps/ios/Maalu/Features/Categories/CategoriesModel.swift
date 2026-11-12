import Foundation
import Observation

@MainActor @Observable
final class CategoriesModel {
    private(set) var categories: [Category] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var search = ""

    /// What the search leaves; the list is small, so it is done here.
    var visible: [Category] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        guard !typed.isEmpty else { return categories }
        return categories.filter { $0.path.localizedStandardContains(typed) }
    }

    var unsortedCount: Int { categories.filter { $0.effectiveKind == nil }.count }

    func load(using api: Api) async {
        let result: ApiResult<[Category]> = await api.get("categories")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            categories = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Returns a message when the server refused (for example "in use"), nil on success.
    func delete(_ category: Category, using api: Api) async -> String? {
        let result = await api.delete("categories/\(category.id)")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil on success.
    func merge(_ category: Category, into target: Category, using api: Api) async -> String? {
        let result: ApiResult<Category> = await api.postJSON("categories/\(category.id)/merge", body: CategoryMergeRequest(intoId: target.id))
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Sets each group of changes at once. Returns a message when the server refused, nil on success.
    func setKinds(_ changes: [(ids: [String], kind: CategoryKind?)], using api: Api) async -> String? {
        for change in changes where !change.ids.isEmpty {
            let result: ApiResult<CategoryKindResult> = await api.patchJSON("categories/kind", body: CategoryKindRequest(ids: change.ids, kind: change.kind))
            if case .failed(_, let message) = result { return message }
        }
        await load(using: api)
        return nil
    }
}

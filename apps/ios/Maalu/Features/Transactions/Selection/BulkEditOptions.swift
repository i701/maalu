import Observation

/// The names the bulk edit can choose from.
@MainActor @Observable
final class BulkEditOptions {
    private(set) var categories: [String] = []
    private(set) var vendors: [String] = []
    private(set) var tags: [String] = []

    func load(using api: Api) async {
        async let categoriesResult: ApiResult<[NamedRef]> = api.get("categories")
        async let vendorsResult: ApiResult<[NamedRef]> = api.get("vendors")
        async let tagsResult: ApiResult<[NamedRef]> = api.get("tags")
        let (categories, vendors, tags) = await (categoriesResult, vendorsResult, tagsResult)
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = vendors { self.vendors = list.map(\.name) }
        if case .ok(let list, _) = tags { self.tags = list.map(\.name) }
    }
}

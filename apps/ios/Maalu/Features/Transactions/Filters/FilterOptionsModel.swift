import Observation

@MainActor @Observable
final class FilterOptionsModel {
    private(set) var accounts: [Account] = []
    private(set) var categories: [NamedRef] = []
    private(set) var tags: [NamedRef] = []
    private(set) var cards: [NamedRef] = []
    private(set) var isLoading = true

    func load(using api: Api) async {
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")
        async let categoriesResult: ApiResult<[NamedRef]> = api.get("categories")
        async let tagsResult: ApiResult<[NamedRef]> = api.get("tags")
        async let cardsResult: ApiResult<[NamedRef]> = api.get("cards")
        let (accounts, categories, tags, cards) = await (accountsResult, categoriesResult, tagsResult, cardsResult)
        isLoading = false
        if case .ok(let list, _) = accounts { self.accounts = list }
        if case .ok(let list, _) = categories { self.categories = list }
        if case .ok(let list, _) = tags { self.tags = list }
        if case .ok(let list, _) = cards { self.cards = list }
    }
}

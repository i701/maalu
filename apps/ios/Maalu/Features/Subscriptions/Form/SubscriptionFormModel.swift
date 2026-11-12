import Foundation
import Observation

@MainActor @Observable
final class SubscriptionFormModel {
    var draft: SubscriptionDraft
    private(set) var accounts: [Account] = []
    private(set) var categories: [String] = []
    private(set) var vendors: [String] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Subscription?
    private let originalDraft: SubscriptionDraft

    init(editing subscription: Subscription? = nil) {
        let start = subscription.map(SubscriptionDraft.init(editing:)) ?? SubscriptionDraft()
        original = subscription
        draft = start
        originalDraft = start
    }

    var isEditing: Bool { original != nil }
    var currency: String { draft.currency(accounts: accounts, baseCurrency: baseCurrency) }
    var needsRate: Bool { !baseCurrency.isEmpty && currency != baseCurrency }
    var problem: LocalizedStringResource? { draft.problem(accounts: accounts, baseCurrency: baseCurrency) }
    var canSave: Bool { !isLoading && !isSaving && problem == nil && (!isEditing || draft != originalDraft) }

    func load(using api: Api) async {
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")
        async let categoriesResult: ApiResult<[NamedRef]> = api.get("categories")
        async let vendorsResult: ApiResult<[NamedRef]> = api.get("vendors")
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        let (accounts, categories, vendors, profile) = await (accountsResult, categoriesResult, vendorsResult, profileResult)
        isLoading = false
        if case .ok(let list, _) = accounts { self.accounts = list }
        if case .ok(let me, _) = profile { baseCurrency = me.baseCurrency }
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = vendors { self.vendors = list.map(\.name) }
    }

    /// Picking an account takes its currency, so a foreign one starts from the rate the account is valued at.
    func accountChanged() {
        guard let account = accounts.first(where: { $0.id == draft.accountID }), account.currency != baseCurrency else { return }
        if let rate = Money.decimal(account.exchangeRate) { draft.rate = rate }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Subscription>
        if let original {
            result = await api.patchJSON("subscriptions/\(original.id)", body: draft.patchRequest(from: originalDraft, accounts: accounts, baseCurrency: baseCurrency))
        } else {
            result = await api.postJSON("subscriptions", body: draft.createRequest(accounts: accounts, baseCurrency: baseCurrency))
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

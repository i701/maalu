import Foundation
import Observation

@MainActor @Observable
final class TransactionFormModel {
    var draft: TransactionDraft
    private(set) var accounts: [Account] = []
    private(set) var categories: [String] = []
    private(set) var vendors: [String] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Transaction?
    private var suggestedMethod = PaymentMethod.other

    init(editing transaction: Transaction? = nil) {
        original = transaction
        draft = transaction.map(TransactionDraft.init(editing:)) ?? TransactionDraft()
    }

    var isEditing: Bool { original != nil }
    var account: Account? { accounts.first { $0.id == draft.accountID } }
    var toAccount: Account? { accounts.first { $0.id == draft.toAccountID } }
    var problem: LocalizedStringResource? { draft.problem(accounts: accounts, baseCurrency: baseCurrency) }
    var canSave: Bool { !isLoading && !isSaving && problem == nil }

    var needsRate: Bool {
        guard draft.type != .transfer, let account else { return false }
        return account.currency != baseCurrency
    }

    var needsToAmount: Bool {
        guard draft.type == .transfer, let account, let toAccount else { return false }
        return account.currency != toAccount.currency
    }

    func load(using api: Api) async {
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")
        async let categoriesResult: ApiResult<[NamedRef]> = api.get("categories")
        async let vendorsResult: ApiResult<[NamedRef]> = api.get("vendors")
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        let (accounts, categories, vendors, profile) = await (accountsResult, categoriesResult, vendorsResult, profileResult)
        isLoading = false

        guard case .ok(let accountList, _) = accounts, case .ok(let me, _) = profile else {
            errorMessage = failure(accounts) ?? failure(profile)
            return
        }
        self.accounts = accountList
        baseCurrency = me.baseCurrency
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = vendors { self.vendors = list.map(\.name) }
        if !isEditing { chooseDefaultAccount(preferring: me.defaultAccountId) }
    }

    func accountChanged() {
        guard let account else { return }
        if let rate = Money.decimal(account.exchangeRate), account.currency != baseCurrency { draft.rate = rate }
        let suggestion = PaymentMethod.suggested(forGroup: account.group)
        if draft.method == suggestedMethod { draft.method = suggestion }
        suggestedMethod = suggestion
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let request = draft.request(accounts: accounts, baseCurrency: baseCurrency, editing: original)
        let result: ApiResult<Transaction>
        if let original {
            result = await api.patchJSON("transactions/\(original.id)", body: request)
        } else {
            result = await api.postJSON("transactions", body: request)
        }
        isSaving = false
        if let message = failure(result) {
            errorMessage = message
            return false
        }
        return true
    }

    private func chooseDefaultAccount(preferring id: String?) {
        draft.accountID = accounts.first { $0.id == id }?.id ?? accounts.first?.id
        accountChanged()
    }

    private func failure<T>(_ result: ApiResult<T>) -> String? {
        if case .failed(_, let message) = result { message } else { nil }
    }
}

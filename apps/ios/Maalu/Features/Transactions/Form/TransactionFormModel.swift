import Foundation
import Observation

@MainActor @Observable
final class TransactionFormModel {
    var draft: TransactionDraft
    private(set) var accounts: [Account] = []
    private(set) var categories: [String] = []
    private(set) var vendors: [String] = []
    private(set) var templates: [TransactionTemplate] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Transaction?
    /// Whether the person has set "Planned" themselves, which a change of date then never overrides.
    private var plannedTouched: Bool
    private var suggestedMethod = PaymentMethod.other
    private var defaultAccountId: String?

    init(editing transaction: Transaction? = nil, startingFrom template: TransactionTemplate? = nil) {
        original = transaction
        plannedTouched = transaction != nil
        if let transaction {
            draft = TransactionDraft(editing: transaction)
        } else if let template {
            draft = TransactionDraft(startingFrom: template)
        } else {
            draft = TransactionDraft()
        }
    }

    var isEditing: Bool { original != nil }

    /// The Planned switch: setting it marks it as the person's own choice, so a later change of date leaves it alone.
    var isPlanned: Bool {
        get { draft.planned }
        set {
            guard newValue != draft.planned else { return }
            draft.planned = newValue
            plannedTouched = true
        }
    }

    /// A future date plans the transaction and a past or present one posts it, until the person has chosen.
    func dateChanged() {
        guard !plannedTouched else { return }
        draft.planned = draft.isFuture
    }
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
        async let templatesResult: ApiResult<[TransactionTemplate]> = api.get("templates")
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        let (accounts, categories, vendors, templates, profile) = await (accountsResult, categoriesResult, vendorsResult, templatesResult, profileResult)
        isLoading = false

        guard case .ok(let accountList, _) = accounts, case .ok(let me, _) = profile else {
            errorMessage = failure(accounts) ?? failure(profile)
            return
        }
        self.accounts = accountList
        baseCurrency = me.baseCurrency
        defaultAccountId = me.defaultAccountId
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = vendors { self.vendors = list.map(\.name) }
        if case .ok(let list, _) = templates { self.templates = list }
        if !isEditing { settleAccount(preferring: defaultAccountId) }
    }

    func accountChanged() {
        guard let account else { return }
        if let rate = Money.decimal(account.exchangeRate), account.currency != baseCurrency { draft.rate = rate }
        let suggestion = PaymentMethod.suggested(for: account.group)
        if draft.method == suggestedMethod { draft.method = suggestion }
        suggestedMethod = suggestion
    }

    /// A template's account that still exists is kept (its rate fills in); one that is gone falls
    /// back to the default account, and a missing destination is left for the form to ask about.
    private func settleAccount(preferring defaultAccountId: String?) {
        if let id = draft.accountID, accounts.contains(where: { $0.id == id }) {
            accountChanged()
        } else {
            draft.accountID = nil
            chooseDefaultAccount(preferring: defaultAccountId)
        }
        if draft.toAccountID != nil, !accounts.contains(where: { $0.id == draft.toAccountID }) {
            draft.toAccountID = nil
        }
    }

    /// Starting from a saved template: it replaces what is on the form, and the account's rate fills in.
    func apply(_ template: TransactionTemplate) {
        draft = TransactionDraft(startingFrom: template)
        settleAccount(preferring: defaultAccountId)
    }

    /// Returns a message when the server refused, nil on success.
    func saveTemplate(named name: String, using api: Api) async -> String? {
        let request = TemplateRequest(draft: draft, accounts: accounts, name: name)
        let result: ApiResult<TransactionTemplate> = await api.postJSON("templates", body: request)
        if case .failed(_, let message) = result { return message }
        return nil
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

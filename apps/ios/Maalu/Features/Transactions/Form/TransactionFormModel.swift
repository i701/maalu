import Foundation
import Observation

@MainActor @Observable
final class TransactionFormModel {
    var draft: TransactionDraft
    private(set) var accounts: [Account] = []
    private(set) var categories: [String] = []
    private(set) var vendorRecords: [Vendor] = []
    private(set) var tags: [String] = []
    private(set) var cards: [Card] = []
    private(set) var templates: [TransactionTemplate] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    /// How many were saved with "Save and add another" while the form stayed open.
    private(set) var savedCount = 0
    private(set) var pending: [PendingAttachment] = []
    /// Web addresses for a new transaction, added once it exists.
    private(set) var pendingLinks: [PendingLink] = []
    /// Set when the transaction was created but some of its files or links were not.
    private(set) var filesPendingFor: String?
    private let original: Transaction?
    /// Whether the person has set "Planned" themselves, which a change of date then never overrides.
    private var plannedTouched: Bool
    private var suggestedMethod = PaymentMethod.other
    private var defaultAccountId: String?

    /// `seed` is a new transaction already filled in, such as a card repayment.
    init(editing transaction: Transaction? = nil, duplicating copy: Transaction? = nil, startingFrom template: TransactionTemplate? = nil, seed: TransactionDraft? = nil) {
        original = transaction
        plannedTouched = transaction != nil
        if let transaction {
            draft = TransactionDraft(editing: transaction)
        } else if let copy {
            draft = TransactionDraft(duplicating: copy)
        } else if let template {
            draft = TransactionDraft(startingFrom: template)
        } else if let seed {
            draft = seed
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
    var accountCards: [Card] { cards.filter { $0.account.id == draft.accountID } }

    var hasTime: Bool {
        get { draft.time != nil }
        set { draft.time = newValue ? (draft.time ?? .now) : nil }
    }

    var time: Date {
        get { draft.time ?? .now }
        set { draft.time = newValue }
    }
    var toAccount: Account? { accounts.first { $0.id == draft.toAccountID } }
    var problem: LocalizedStringResource? { draft.problem(accounts: accounts, baseCurrency: baseCurrency) }

    /// The chosen account's currency, which the amount is in.
    var currency: String { accounts.first { $0.id == draft.accountID }?.currency ?? baseCurrency }
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
        async let vendorsResult: ApiResult<[Vendor]> = api.get("vendors")
        async let templatesResult: ApiResult<[TransactionTemplate]> = api.get("templates")
        async let tagsResult: ApiResult<[NamedRef]> = api.get("tags")
        async let cardsResult: ApiResult<[Card]> = api.get("cards")
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        let (accounts, categories, vendors, templates, tags, cards, profile) = await (
            accountsResult, categoriesResult, vendorsResult, templatesResult, tagsResult, cardsResult, profileResult
        )
        isLoading = false

        guard case .ok(let accountList, _) = accounts, case .ok(let me, _) = profile else {
            errorMessage = failure(accounts) ?? failure(profile)
            return
        }
        self.accounts = accountList
        baseCurrency = me.baseCurrency
        defaultAccountId = me.defaultAccountId
        if case .ok(let list, _) = categories { self.categories = list.map(\.name) }
        if case .ok(let list, _) = vendors { vendorRecords = list }
        if case .ok(let list, _) = templates { self.templates = list }
        if case .ok(let list, _) = tags { self.tags = list.map(\.name) }
        if case .ok(let list, _) = cards { self.cards = list }
        if !isEditing { settleAccount(preferring: defaultAccountId) }
    }

    var vendors: [String] { vendorRecords.map(\.name) }

    /// Picking a known vendor that has a usual place marks it, unless a place is already marked.
    func vendorChanged() {
        guard draft.location == nil,
              let vendor = vendorRecords.first(where: { $0.name.caseInsensitiveCompare(draft.vendor) == .orderedSame }),
              let location = vendor.location else { return }
        draft.location = location
    }

    func accountChanged() {
        if let cardID = draft.cardID, !accountCards.contains(where: { $0.id == cardID }) { draft.cardID = nil }
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
        defer { isSaving = false }
        // a transaction already made whose files did not all go up: only the files are sent again
        if let savedID = filesPendingFor { return await uploadPending(to: savedID, using: api) }
        let request = draft.request(accounts: accounts, baseCurrency: baseCurrency, editing: original)
        let result: ApiResult<Transaction>
        if let original {
            result = await api.patchJSON("transactions/\(original.id)", body: request)
        } else {
            result = await api.postJSON("transactions", body: request)
        }
        switch result {
        case .failed(_, let message):
            errorMessage = message
            return false
        case .ok(let saved, _):
            return pending.isEmpty && pendingLinks.isEmpty ? true : await uploadPending(to: saved.id, using: api)
        }
    }

    /// Returns a message when the file cannot be added.
    func attach(_ data: Data, filename: String, contentType: String) -> LocalizedStringResource? {
        if let problem = PendingAttachment.problem(adding: data, to: pending) { return problem }
        pending.append(PendingAttachment(filename: filename, data: data, contentType: contentType))
        return nil
    }

    func removeAttachment(_ attachment: PendingAttachment) {
        pending.removeAll { $0.id == attachment.id }
    }

    /// Returns a message when the typed address cannot be added.
    func addLink(_ typed: String) -> LocalizedStringResource? {
        if pendingLinks.count >= PendingAttachment.maxCount { return "A transaction takes at most 10 links." }
        switch ParsedLink(typed) {
        case .problem(let problem): return problem
        case .url(let url):
            pendingLinks.append(PendingLink(url: url))
            return nil
        }
    }

    func removeLink(_ link: PendingLink) {
        pendingLinks.removeAll { $0.id == link.id }
    }

    private func uploadPending(to transactionID: String, using api: Api) async -> Bool {
        var failed: [PendingAttachment] = []
        var failedLinks: [PendingLink] = []
        var lastMessage = ""
        for file in pending {
            let result = await api.upload("transactions/\(transactionID)/attachments", query: [URLQueryItem(name: "filename", value: file.filename)], data: file.data, contentType: file.contentType)
            if case .failed(_, let message) = result {
                failed.append(file)
                lastMessage = message
            }
        }
        for link in pendingLinks {
            let result: ApiResult<TransactionLink> = await api.postJSON("transactions/\(transactionID)/links", body: ["url": link.url])
            if case .failed(_, let message) = result {
                failedLinks.append(link)
                lastMessage = message
            }
        }
        pending = failed
        pendingLinks = failedLinks
        guard failed.isEmpty && failedLinks.isEmpty else {
            filesPendingFor = transactionID
            errorMessage = String(localized: "The transaction is saved, but \(failed.count + failedLinks.count) file(s) or link(s) did not go up (\(lastMessage)). Save again to retry them.")
            return false
        }
        filesPendingFor = nil
        return true
    }

    /// Saves a new transaction and leaves the form ready for the next one.
    func saveAndAddAnother(using api: Api) async -> Bool {
        guard await save(using: api) else { return false }
        draft = draft.nextEntry()
        plannedTouched = false
        settleAccount(preferring: defaultAccountId)
        savedCount += 1
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

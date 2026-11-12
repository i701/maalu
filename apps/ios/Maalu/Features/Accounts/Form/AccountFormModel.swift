import Foundation
import Observation

@MainActor @Observable
final class AccountFormModel {
    var draft: AccountDraft
    private(set) var currencies: [String] = []
    private(set) var banks: [String] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    /// Says where the rate in the field came from ("Looking up the market rate…", "Market rate for …").
    private(set) var rateNote: LocalizedStringResource?
    /// Whether the last lookup failed, so the form can offer to try again.
    private(set) var rateLookupFailed = false
    private var api: Api?
    private let original: Account?
    private let originalDraft: AccountDraft
    /// Whether the person has typed their own rate, which a market suggestion never replaces.
    private var rateTouched = false

    private static let usualBanks = ["BML", "MIB", "SBI", "HDFC", "Ooredoo m-Faisa", "Dhiraagu Pay"]

    init(editing account: Account? = nil) {
        let start = account.map(AccountDraft.init(editing:)) ?? AccountDraft()
        original = account
        draft = start
        originalDraft = start
    }

    var isEditing: Bool { original != nil }
    var isForeign: Bool { draft.isForeign(base: baseCurrency) }
    var problem: LocalizedStringResource? { draft.problem(baseCurrency: baseCurrency) }
    var canSave: Bool { !isLoading && !isSaving && problem == nil && (!isEditing || draft != originalDraft) }

    /// The rate field: the draft's rate, marked as touched the moment the person types, so a market
    /// suggestion that lands afterwards never replaces their own. The suggestion itself is written
    /// straight to the draft.
    var rate: Decimal? {
        get { draft.rate }
        set {
            // DecimalField also writes back text it rewrites; only a different value is typing.
            guard newValue != draft.rate else { return }
            draft.rate = newValue
            rateTouched = true
        }
    }

    /// Picking a currency clears the rate and, for a foreign one, fills in today's market rate
    /// until the person types their own.
    func currencyChanged() {
        guard !draft.currency.isEmpty, draft.currency != baseCurrency else {
            draft.rate = nil
            rateTouched = false
            rateNote = nil
            return
        }
        draft.rate = nil
        rateTouched = false
        rateLookupFailed = false
        rateNote = "Looking up the market rate…"
        Task { await fetchMarketRate(for: draft.currency) }
    }

    /// Asks the source again after a failed lookup, without touching a rate the person typed.
    func retryRate() {
        guard !draft.currency.isEmpty, draft.currency != baseCurrency else { return }
        rateLookupFailed = false
        rateNote = "Looking up the market rate…"
        Task { await fetchMarketRate(for: draft.currency) }
    }

    private func fetchMarketRate(for currency: String) async {
        guard let api else { return }
        let result = await lookUp(currency, using: api)
        // An answer for a currency that was changed since is dropped.
        guard draft.currency == currency else { return }
        apply(result)
    }

    private func lookUp(_ currency: String, using api: Api) async -> ApiResult<MarketRate> {
        await api.get("currencies/rate", query: [
            URLQueryItem(name: "base", value: currency),
            URLQueryItem(name: "quote", value: baseCurrency),
            URLQueryItem(name: "on", value: ISODate.string(Date.now)),
        ])
    }

    private func apply(_ result: ApiResult<MarketRate>) {
        switch result {
        case .ok(let market, _):
            rateLookupFailed = false
            if !rateTouched, let value = Money.decimal(market.rate) { draft.rate = value }
            rateNote = Self.marketNote(market)
        case .failed(404, _):
            rateLookupFailed = true
            rateNote = "No market rate found for this pair. Enter the rate yourself."
        case .failed:
            rateLookupFailed = true
            rateNote = "Couldn't look up the market rate. Enter the rate yourself."
        }
    }

    private static func marketNote(_ market: MarketRate) -> LocalizedStringResource {
        let day = ISODate.date(market.rateDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? market.rateDate
        let nearest = market.exact ? "" : " (nearest day)"
        return "Market rate for \(day)\(nearest), from \(market.source). Change it if your bank used another."
    }

    func load(using api: Api) async {
        self.api = api
        async let profile: ApiResult<Profile> = api.get("users/me")
        async let list: ApiResult<CurrencyList> = api.get("currencies")
        async let accounts: ApiResult<[Account]> = api.get("accounts")
        let (me, codes, all) = await (profile, list, accounts)
        isLoading = false
        if case .ok(let me, _) = me {
            baseCurrency = me.baseCurrency
            if draft.currency.isEmpty { draft.currency = me.baseCurrency }
        }
        if case .ok(let codes, _) = codes { currencies = codes.currencies }
        if case .ok(let all, _) = all {
            let used = all.compactMap(\.bank).filter { !$0.isEmpty }
            banks = Array(NSOrderedSet(array: used + Self.usualBanks)) as? [String] ?? used
        }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Account>
        if let original {
            result = await api.patchJSON("accounts/\(original.id)", body: draft.patchRequest(from: originalDraft, baseCurrency: baseCurrency))
        } else {
            result = await api.postJSON("accounts", body: draft.createRequest(baseCurrency: baseCurrency))
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

import Foundation
import Observation

@MainActor @Observable
final class AccountDetailModel {
    var range = AccountHistoryRange.quarter
    var query = ""
    private(set) var points: [AccountBalancePoint] = []
    private(set) var month: TransactionTotals?
    private(set) var transactions: [Transaction] = []
    private(set) var balances: [String: String] = [:]
    private(set) var baseCurrency = ""
    /// The cards on this account: its debit cards, or a credit card's own.
    private(set) var cards: [Card] = []
    private(set) var isLoading = true
    private(set) var pageFailed = false
    private var total = 0

    private static let pageSize = 30
    private static let balancesLimit = 500

    var lowest: AccountBalancePoint? { points.min { $0.value < $1.value } }
    var highest: AccountBalancePoint? { points.max { $0.value < $1.value } }
    var hasMore: Bool { transactions.count < total }

    func load(accountID: String, using api: Api, now: Date = .now) async {
        let month = MonthRange(containing: now)
        async let historyResult: ApiResult<BalanceHistory> = api.get("accounts/\(accountID)/balance-history", query: [
            URLQueryItem(name: "days", value: String(range.rawValue)),
        ])
        async let monthResult: ApiResult<TransactionTotals> = api.get("transactions/summary", query: [
            URLQueryItem(name: "account_id", value: accountID),
            URLQueryItem(name: "date_from", value: ISODate.string(month.start)),
            URLQueryItem(name: "date_to", value: ISODate.string(month.end)),
        ])
        async let afterResult: ApiResult<[BalanceAfter]> = api.get("accounts/\(accountID)/balances-after", query: [
            URLQueryItem(name: "limit", value: String(Self.balancesLimit)),
        ])
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        async let cardsResult: ApiResult<[Card]> = api.get("cards")
        let (history, totals, after, me, cards) = await (historyResult, monthResult, afterResult, profileResult, cardsResult)
        if case .ok(let me, _) = me { baseCurrency = me.baseCurrency }
        guard !Task.isCancelled else { return }
        if case .ok(let value, _) = history { points = value.points }
        if case .ok(let value, _) = totals { self.month = value }
        if case .ok(let value, _) = cards { self.cards = value.filter { $0.account.id == accountID } }
        if case .ok(let value, _) = after { balances = Dictionary(value.map { ($0.transactionId, $0.balance) }, uniquingKeysWith: { first, _ in first }) }
    }

    func loadTransactions(accountID: String, using api: Api, debounced: Bool = false) async {
        if debounced {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
        }
        let result: ApiResult<[Transaction]> = await api.get("transactions", query: transactionsQuery(accountID: accountID, offset: 0))
        guard !Task.isCancelled else { return }
        isLoading = false
        pageFailed = false
        if case .ok(let page, let total) = result {
            transactions = page
            self.total = total ?? page.count
        }
    }

    func loadMore(accountID: String, using api: Api) async {
        guard hasMore else { return }
        pageFailed = false
        let result: ApiResult<[Transaction]> = await api.get("transactions", query: transactionsQuery(accountID: accountID, offset: transactions.count))
        guard !Task.isCancelled else { return }
        switch result {
        case .ok(let page, _): transactions += page
        case .failed: pageFailed = true
        }
    }

    /// Returns a message when the server refused, nil on success.
    func archive(_ account: Account, using api: Api) async -> String? {
        let result = await api.post("accounts/\(account.id)/\(account.isArchived ? "unarchive" : "archive")")
        if case .failed(_, let message) = result { return message }
        return nil
    }

    func delete(_ account: Account, using api: Api) async -> String? {
        let result = await api.delete("accounts/\(account.id)")
        if case .failed(_, let message) = result { return message }
        return nil
    }

    private func transactionsQuery(accountID: String, offset: Int) -> [URLQueryItem] {
        var items = [
            URLQueryItem(name: "account_id", value: accountID),
            URLQueryItem(name: "limit", value: String(Self.pageSize)),
            URLQueryItem(name: "offset", value: String(offset)),
        ]
        let text = query.trimmingCharacters(in: .whitespaces)
        if !text.isEmpty { items.append(URLQueryItem(name: "q", value: text)) }
        return items
    }

    /// Returns a message when the server refused, nil when the card is gone; its transactions keep their account.
    func deleteCard(_ card: Card, using api: Api) async -> String? {
        let result = await api.delete("cards/\(card.id)")
        if case .failed(_, let message) = result { return message }
        cards.removeAll { $0.id == card.id }
        return nil
    }
}

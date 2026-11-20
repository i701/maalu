import Foundation
import Observation
import SwiftUI

@MainActor @Observable
final class TransactionsModel {
    var filter = TransactionFilter()
    private(set) var days: [TransactionDay] = []
    private(set) var totals: TransactionTotals?
    /// The base currency the totals are in, learnt once, so the totals can show zeros the moment a filter is on instead of waiting for the server.
    private var totalsCurrency = ""
    /// Pairs that look like one transfer entered twice. Only for the whole list: a narrowed one has none.
    private(set) var transferSuggestions: [TransferSuggestion] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private var transactions: [Transaction] = []
    private var total = 0

    private static let pageSize = 50

    var isEmpty: Bool { transactions.isEmpty }

    /// The totals line is for a narrowed list; planned rows are not counted in totals.
    private var showsTotals: Bool { filter.isActive && !filter.planned }

    /// What the card shows: the last totals, or zeros while the first ones are on their way, so the section is there at once and the figures roll up.
    var displayedTotals: TransactionTotals? {
        guard showsTotals else { return nil }
        if let totals { return totals }
        guard isLoading, !totalsCurrency.isEmpty else { return nil }
        return TransactionTotals(currency: totalsCurrency, income: "0", expense: "0")
    }
    var hasMore: Bool { transactions.count < total }
    /// How many rows match the filters, loaded or not.
    var matchCount: Int { total }
    var loadedIDs: [String] { transactions.map(\.id) }

    func reload(using api: Api, debounced: Bool = false) async {
        if debounced {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
        }
        isLoading = true
        async let pageResult: ApiResult<[Transaction]> = api.get("transactions", query: query(offset: 0))
        async let totalsResult: ApiResult<TransactionTotals>? = showsTotals ? api.get("transactions/summary", query: filter.queryItems) : nil
        async let profileResult: ApiResult<Profile>? = totalsCurrency.isEmpty ? api.get("users/me") : nil
        async let suggestionsResult: ApiResult<[TransferSuggestion]>? = filter.isActive ? nil : api.get("transactions/transfer-suggestions")
        let (result, totals, suggestions, profile) = await (pageResult, totalsResult, suggestionsResult, profileResult)
        guard !Task.isCancelled else { return }
        // one animated transaction for everything the reload changes: the figures roll, the rows fade and slide instead of jumping
        withAnimation(.smooth(duration: 0.35)) {
            isLoading = false
            if case .ok(let value, _) = totals { self.totals = value } else { self.totals = nil }
            if case .ok(let me, _)? = profile { totalsCurrency = me.baseCurrency }
            // a failure just means no card
            if case .ok(let value, _)? = suggestions { transferSuggestions = value } else { transferSuggestions = [] }
            if case .ok(let page, let total) = result {
                transactions = page
                self.total = total ?? page.count
            }
            finish(result)
        }
    }

    func transaction(id: String) -> Transaction? {
        transactions.first { $0.id == id }
    }

    /// Returns a message when the server refused, nil when the transaction went to the trash.
    func delete(id: String, using api: Api) async -> String? {
        let result = await api.delete("transactions/\(id)")
        if case .failed(_, let message) = result { return message }
        await reload(using: api)
        return nil
    }

    func loadMore(using api: Api) async {
        guard hasMore else { return }
        errorMessage = nil
        let result: ApiResult<[Transaction]> = await api.get("transactions", query: query(offset: transactions.count))
        guard !Task.isCancelled else { return }
        if case .ok(let page, _) = result { transactions += page }
        finish(result)
    }

    private func finish(_ result: ApiResult<[Transaction]>) {
        switch result {
        case .ok:
            errorMessage = nil
            days = TransactionDay.grouping(transactions)
        case .failed(_, let message):
            errorMessage = message
        }
    }

    private func query(offset: Int) -> [URLQueryItem] {
        [
            URLQueryItem(name: "limit", value: String(Self.pageSize)),
            URLQueryItem(name: "offset", value: String(offset)),
        ] + filter.queryItems
    }
}

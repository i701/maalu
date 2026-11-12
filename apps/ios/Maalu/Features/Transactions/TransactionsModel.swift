import Foundation
import Observation

@MainActor @Observable
final class TransactionsModel {
    var filter = TransactionFilter()
    private(set) var days: [TransactionDay] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private var transactions: [Transaction] = []
    private var total = 0

    private static let pageSize = 50

    var isEmpty: Bool { transactions.isEmpty }
    var hasMore: Bool { transactions.count < total }

    func reload(using api: Api, debounced: Bool = false) async {
        if debounced {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
        }
        isLoading = true
        let result: ApiResult<[Transaction]> = await api.get("transactions", query: query(offset: 0))
        guard !Task.isCancelled else { return }
        isLoading = false
        if case .ok(let page, let total) = result {
            transactions = page
            self.total = total ?? page.count
        }
        finish(result)
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

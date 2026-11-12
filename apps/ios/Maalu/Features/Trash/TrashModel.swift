import Foundation
import Observation

@MainActor @Observable
final class TrashModel {
    private(set) var transactions: [Transaction] = []
    private(set) var isLoading = false
    private(set) var errorMessage: String?
    private var total = 0

    private static let pageSize = 50

    var isEmpty: Bool { transactions.isEmpty }
    var hasMore: Bool { transactions.count < total }

    func reload(using api: Api) async {
        isLoading = true
        let result: ApiResult<[Transaction]> = await api.get("transactions/trash", query: query(offset: 0))
        guard !Task.isCancelled else { return }
        isLoading = false
        if case .ok(let page, let total) = result {
            transactions = page
            self.total = total ?? page.count
        }
        finish(result)
    }

    func loadMore(using api: Api) async {
        guard hasMore else { return }
        errorMessage = nil
        let result: ApiResult<[Transaction]> = await api.get("transactions/trash", query: query(offset: transactions.count))
        guard !Task.isCancelled else { return }
        if case .ok(let page, let total) = result {
            transactions += page
            self.total = total ?? transactions.count
        }
        finish(result)
    }

    /// Returns a message when the server refused, nil when the transaction was restored.
    func restore(_ transaction: Transaction, using api: Api) async -> String? {
        let result: ApiResult<Transaction> = await api.post("transactions/\(transaction.id)/restore")
        if case .failed(_, let message) = result { return message }
        remove(transaction)
        return nil
    }

    /// Returns a message when the server refused, nil when the transaction is gone for good.
    func deleteForever(_ transaction: Transaction, using api: Api) async -> String? {
        let result = await api.delete("transactions/\(transaction.id)/permanent")
        if case .failed(_, let message) = result { return message }
        remove(transaction)
        return nil
    }

    /// Takes a row out of the list and the count, so "there is more" stays right without a refetch.
    private func remove(_ transaction: Transaction) {
        guard transactions.contains(where: { $0.id == transaction.id }) else { return }
        transactions.removeAll { $0.id == transaction.id }
        total = max(0, total - 1)
    }

    private func query(offset: Int) -> [URLQueryItem] {
        [
            URLQueryItem(name: "limit", value: String(Self.pageSize)),
            URLQueryItem(name: "offset", value: String(offset)),
        ]
    }

    private func finish(_ result: ApiResult<[Transaction]>) {
        switch result {
        case .ok:
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

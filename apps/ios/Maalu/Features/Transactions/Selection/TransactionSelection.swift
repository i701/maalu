import Foundation
import Observation

/// The rows picked on the transactions list for a bulk action. A request takes at most 500 ids, so a bigger selection goes in batches.
@MainActor @Observable
final class TransactionSelection {
    private(set) var isSelecting = false
    private(set) var ids: Set<String> = []
    private(set) var isBusy = false
    /// The selection reaches past what is loaded: it is every row that matches the filters.
    private(set) var isWide = false

    /// The most the API will select across pages at once (`GET /transactions/ids` refuses past it).
    static let maxSelectAll = 5000
    static let batchSize = 500

    var count: Int { ids.count }

    func start() {
        isSelecting = true
    }

    /// Leaves picking and forgets what was picked.
    func finish() {
        isSelecting = false
        ids = []
        isWide = false
    }

    /// Forgets what was picked but stays in picking mode: a new search or filter changes which rows are there to pick.
    func clearPicks() {
        ids = []
        isWide = false
    }

    func toggle(_ id: String) {
        if ids.contains(id) { ids.remove(id) } else { ids.insert(id) }
        isWide = false
    }

    func contains(_ id: String) -> Bool {
        ids.contains(id)
    }

    /// Picks every row that matches the filters: the loaded ones, or, when more match, all of them from the server.
    /// Returns a message when it could not.
    func selectAll(loaded: [String], matching total: Int, filter: TransactionFilter, using api: Api) async -> String? {
        if total <= loaded.count {
            ids = Set(loaded)
            isWide = false
            return nil
        }
        if total > Self.maxSelectAll {
            return String(localized: "\(total) match: narrow it to \(Self.maxSelectAll) or fewer to select them all.")
        }
        isBusy = true
        defer { isBusy = false }
        let result: ApiResult<[String]> = await api.get("transactions/ids", query: filter.queryItems)
        switch result {
        case .ok(let all, _):
            ids = Set(all)
            isWide = true
            return nil
        case .failed(_, let message):
            return message
        }
    }

    /// Changes the same things on every picked row. Returns the line to show.
    func apply(_ edit: BulkEdit, using api: Api) async -> String {
        isBusy = true
        defer { isBusy = false }
        var results: [BulkResult] = []
        for batch in Self.batches(of: Array(ids)) {
            let result: ApiResult<BulkResult> = await api.patchJSON("transactions/bulk", body: edit.request(ids: batch))
            switch result {
            case .ok(let value, _): results.append(value)
            case .failed(_, let message): return Self.partial(results, then: message)
            }
        }
        return BulkResult.merged(results).message { String(localized: "Updated \(Self.transactionCount($0))") }
    }

    /// Moves every picked row to the trash. Returns the line to show.
    func trash(using api: Api) async -> String {
        isBusy = true
        defer { isBusy = false }
        var results: [BulkResult] = []
        for batch in Self.batches(of: Array(ids)) {
            let result: ApiResult<BulkResult> = await api.postJSON("transactions/bulk/trash", body: BulkIdsRequest(ids: batch))
            switch result {
            case .ok(let value, _): results.append(value)
            case .failed(_, let message): return Self.partial(results, then: message)
            }
        }
        return BulkResult.merged(results).message { String(localized: "Moved \(Self.transactionCount($0)) to the trash") }
    }

    static func batches(of ids: [String]) -> [[String]] {
        stride(from: 0, to: ids.count, by: batchSize).map { Array(ids[$0..<min($0 + batchSize, ids.count)]) }
    }

    static func transactionCount(_ count: Int) -> String {
        count == 1 ? String(localized: "1 transaction") : String(localized: "\(count) transactions")
    }

    /// A later batch failed after earlier ones went through.
    private static func partial(_ done: [BulkResult], then message: String) -> String {
        done.isEmpty ? message : String(localized: "\(BulkResult.merged(done).updated) done, then it stopped: \(message)")
    }
}

import Foundation
import Observation

@MainActor @Observable
final class GroupDetailModel {
    let id: String
    private(set) var detail: GroupDetail?
    private(set) var isLoading = true
    var errorMessage: String?
    /// Set when the group is gone (deleted, or too few were left), so its screen closes.
    private(set) var isGone = false

    init(id: String) {
        self.id = id
    }

    var room: Int { TransactionGroup.most - (detail?.transactionCount ?? 0) }

    func load(using api: Api) async {
        let result: ApiResult<GroupDetail> = await api.get("groups/\(id)")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            detail = value
            errorMessage = nil
        case .failed(let status, let message):
            if status == 404 { isGone = true } else { errorMessage = message }
        }
    }

    func add(_ ids: Set<String>, using api: Api) async {
        let result: ApiResult<TransactionGroup> = await api.postJSON("groups/\(id)/transactions", body: ["transaction_ids": ids.sorted()])
        if case .failed(_, let message) = result { errorMessage = message }
        await load(using: api)
    }

    /// Takes one out; a group left with fewer than two is deleted by the server.
    func takeOut(_ transaction: Transaction, using api: Api) async {
        let result: ApiResult<GroupRemoved> = await api.postJSON("groups/\(id)/transactions/remove", body: ["transaction_ids": [transaction.id]])
        switch result {
        case .ok(let removed, _) where removed.dissolved: isGone = true
        case .ok: await load(using: api)
        case .failed(_, let message): errorMessage = message
        }
    }

    func delete(using api: Api) async {
        let result = await api.delete("groups/\(id)")
        if case .failed(_, let message) = result { errorMessage = message } else { isGone = true }
    }
}

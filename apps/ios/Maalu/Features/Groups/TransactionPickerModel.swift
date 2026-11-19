import Foundation
import Observation

/// Finds transactions to put in a group: the newest, or those matching a search.
@MainActor @Observable
final class TransactionPickerModel {
    var search = ""
    private(set) var transactions: [Transaction] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    /// The group being added to, whose own members are not offered again.
    let groupID: String?

    init(groupID: String?) {
        self.groupID = groupID
    }

    /// Why a transaction cannot go in, or nil when it can: a transfer never can, nor one already in a group.
    nonisolated static func refusal(of transaction: Transaction, addingTo groupID: String?) -> LocalizedStringResource? {
        if transaction.type == .transfer { return "Transfers can't be grouped" }
        if let group = transaction.group {
            return group.id == groupID ? "Already in this group" : "In \(group.name)"
        }
        return nil
    }

    func load(using api: Api) async {
        var query = [URLQueryItem(name: "limit", value: "50")]
        let typed = search.trimmingCharacters(in: .whitespaces)
        if !typed.isEmpty { query.append(URLQueryItem(name: "q", value: typed)) }
        let result: ApiResult<[Transaction]> = await api.get("transactions", query: query)
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            transactions = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

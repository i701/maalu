import Foundation
import Observation

@MainActor @Observable
final class AccountDetailModel {
    var range = AccountHistoryRange.quarter
    private(set) var points: [AccountBalancePoint] = []
    private(set) var transactions: [Transaction] = []
    private(set) var balances: [String: String] = [:]
    private(set) var baseCurrency = ""
    private(set) var isLoading = true

    private static let transactionLimit = 20

    var lowest: AccountBalancePoint? { points.min { $0.value < $1.value } }
    var highest: AccountBalancePoint? { points.max { $0.value < $1.value } }

    func load(accountID: String, using api: Api) async {
        async let historyResult: ApiResult<BalanceHistory> = api.get("accounts/\(accountID)/balance-history", query: [
            URLQueryItem(name: "days", value: String(range.rawValue)),
        ])
        async let listResult: ApiResult<[Transaction]> = api.get("transactions", query: [
            URLQueryItem(name: "account_id", value: accountID),
            URLQueryItem(name: "limit", value: String(Self.transactionLimit)),
        ])
        async let afterResult: ApiResult<[BalanceAfter]> = api.get("accounts/\(accountID)/balances-after", query: [
            URLQueryItem(name: "limit", value: String(Self.transactionLimit)),
        ])
        async let profileResult: ApiResult<Profile> = api.get("users/me")
        let (history, list, after, me) = await (historyResult, listResult, afterResult, profileResult)
        if case .ok(let me, _) = me { baseCurrency = me.baseCurrency }
        guard !Task.isCancelled else { return }
        isLoading = false
        if case .ok(let value, _) = history { points = value.points }
        if case .ok(let value, _) = list { transactions = value }
        if case .ok(let value, _) = after { balances = Dictionary(value.map { ($0.transactionId, $0.balance) }, uniquingKeysWith: { first, _ in first }) }
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
}

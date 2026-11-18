import Foundation
import Observation

@MainActor @Observable
final class AccountsModel {
    private(set) var accounts: [Account] = []
    private(set) var summary: AccountSummary?
    private(set) var trends: [String: [Double]] = [:]
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var showsArchived = false

    var groups: [AccountGroupSection] {
        AccountGroup.allCases.compactMap { group in
            let members = accounts.filter { $0.group == group }
            return members.isEmpty ? nil : AccountGroupSection(group: group, accounts: members)
        }
    }

    func account(id: String) -> Account? {
        accounts.first { $0.id == id }
    }

    func load(using api: Api) async {
        async let listResult: ApiResult<[Account]> = api.get("accounts", query: showsArchived ? [URLQueryItem(name: "archived", value: "true")] : [])
        async let summaryResult: ApiResult<AccountSummary> = api.get("accounts/summary")
        async let trendsResult: ApiResult<[AccountTrend]> = api.get("accounts/trends", query: [URLQueryItem(name: "days", value: "30")])
        let (result, summary, trends) = await (listResult, summaryResult, trendsResult)
        isLoading = false
        // the summary and trend lines are extras: the list stands without them
        if case .ok(let value, _) = summary { self.summary = value }
        if case .ok(let value, _) = trends { self.trends = Dictionary(value.map { ($0.accountId, $0.values) }, uniquingKeysWith: { first, _ in first }) }
        switch result {
        case .ok(let accounts, _):
            self.accounts = accounts
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

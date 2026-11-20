import Foundation
import Observation

@MainActor @Observable
final class SalaryRulesModel {
    private(set) var rules: [SalaryRule] = []
    private(set) var accounts: [Account] = []
    private(set) var goals: [Goal] = []
    private(set) var baseCurrency = ""
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    var summary: String { SalaryRuleText.summary(rules, currency: baseCurrency) }

    func load(using api: Api) async {
        async let rulesResult: ApiResult<[SalaryRule]> = api.get("salary-rules")
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")
        async let goalsResult: ApiResult<[Goal]> = api.get("goals")
        async let profile: ApiResult<Profile> = api.get("users/me")
        let (rules, accounts, goals, me) = await (rulesResult, accountsResult, goalsResult, profile)
        guard !Task.isCancelled else { return }
        isLoading = false
        // the targets and the currency are extras: the list of rules stands without them
        if case .ok(let value, _) = accounts { self.accounts = value }
        if case .ok(let value, _) = goals { self.goals = value }
        if case .ok(let value, _) = me { baseCurrency = value.baseCurrency }
        switch rules {
        case .ok(let value, _):
            self.rules = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// The accounts or goals that have no rule yet, as (id, name).
    func choices(for target: SalaryRuleDraft.Target) -> [(id: String, name: String)] {
        let taken = Set(rules.compactMap(\.targetId))
        let all = target == .account ? accounts.map { ($0.id, $0.name) } : goals.map { ($0.id, $0.name) }
        return all.filter { !taken.contains($0.0) }.map { (id: $0.0, name: $0.1) }
    }

    /// Returns a message when the server refused, nil on success.
    func delete(_ rule: SalaryRule, using api: Api) async -> String? {
        let result = await api.delete("salary-rules/\(rule.id)")
        if case .failed(_, let message) = result { return message }
        rules.removeAll { $0.id == rule.id }
        return nil
    }
}

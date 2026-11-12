import Foundation
import Observation

@MainActor @Observable
final class BudgetModel {
    var month = MonthRange(containing: .now)
    private(set) var budget: Budget?
    private(set) var goals: [Goal] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    var isCurrentMonth: Bool { month.isCurrent() }
    var kindTotals: [BudgetKindTotal] { BudgetKindTotal.totals(of: budget?.lines ?? []) }

    func move(by months: Int) {
        month = month.shifted(by: months)
    }

    func load(using api: Api) async {
        let on = [URLQueryItem(name: "on", value: ISODate.string(month.start))]
        async let budgetResult: ApiResult<Budget> = api.get("budget", query: on)
        async let goalsResult: ApiResult<[Goal]> = api.get("goals", query: on)
        let (budget, goals) = await (budgetResult, goalsResult)
        guard !Task.isCancelled else { return }
        isLoading = false

        if case .ok(let value, _) = budget { self.budget = value }
        if case .ok(let value, _) = goals { self.goals = value }
        if case .failed(_, let message) = budget, self.budget == nil {
            errorMessage = message
        } else {
            errorMessage = nil
        }
    }
}

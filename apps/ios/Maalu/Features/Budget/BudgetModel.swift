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

    func line(id: String) -> BudgetLine? {
        budget?.lines.first { $0.id == id }
    }

    func goal(id: String) -> Goal? {
        goals.first { $0.id == id }
    }

    /// Returns a message when the server refused, nil when the limit is gone.
    func deleteLine(id: String, using api: Api) async -> String? {
        let result = await api.delete("budget/lines/\(id)")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// The moves that touch a limit this period, each in words from that limit's side.
    func moves(for lineID: String) -> [LineMove] {
        guard let budget else { return [] }
        return budget.moves.compactMap { move in
            MoveText.describe(move, from: lineID, currency: budget.currency).map { LineMove(id: move.id, text: $0, note: move.note) }
        }
    }

    /// Returns a message when the server refused, nil when the move was undone.
    func undoMove(id: String, using api: Api) async -> String? {
        let result: ApiResult<Budget> = await api.post("budget/moves/\(id)/undo")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil when the goal is gone.
    func deleteGoal(id: String, using api: Api) async -> String? {
        let result = await api.delete("goals/\(id)")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

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

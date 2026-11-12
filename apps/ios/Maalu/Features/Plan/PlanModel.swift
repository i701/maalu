import Foundation
import Observation

@MainActor @Observable
final class PlanModel {
    private(set) var available: AvailableToSpend?
    private(set) var plan: MonthPlan?
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    func load(using api: Api) async {
        let result: ApiResult<AvailableToSpend> = await api.get("stats/available-to-spend")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            available = value
            plan = MonthPlan(value)
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    var overdueCount: Int { available?.bills.count { $0.overdue } ?? 0 }
}

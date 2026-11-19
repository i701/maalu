import Foundation
import Observation

@MainActor @Observable
final class BudgetSettingsModel {
    /// The last day a budget month can start on (every month has it), as in the API.
    static let maxStartDay = 28

    var startDay: Int
    var warnPercent: Int
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: (startDay: Int, warnPercent: Int)

    init(budget: Budget) {
        startDay = budget.periodStartDay
        warnPercent = budget.warnPercent
        original = (budget.periodStartDay, budget.warnPercent)
    }

    var warnLevel: Double {
        get { Double(warnPercent) }
        set { warnPercent = Int(newValue.rounded()) }
    }

    /// Only what changed.
    var request: BudgetSettingsRequest {
        BudgetSettingsRequest(
            periodStartDay: startDay != original.startDay ? startDay : nil,
            warnPercent: warnPercent != original.warnPercent ? warnPercent : nil
        )
    }

    var canSave: Bool { !isSaving && request != BudgetSettingsRequest() }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Budget> = await api.patchJSON("budget", body: request)
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

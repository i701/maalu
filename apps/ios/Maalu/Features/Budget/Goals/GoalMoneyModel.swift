import Foundation
import Observation

@MainActor @Observable
final class GoalMoneyModel {
    var draft = GoalMoneyDraft()
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let goalID: String

    init(goalID: String) {
        self.goalID = goalID
    }

    var canSave: Bool { !isSaving && draft.problem == nil }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Goal> = await api.postJSON("goals/\(goalID)/entries", body: draft.request(on: .now))
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

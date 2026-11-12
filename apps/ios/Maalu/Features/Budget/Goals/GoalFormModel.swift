import Foundation
import Observation

@MainActor @Observable
final class GoalFormModel {
    var draft: GoalDraft
    private(set) var accounts: [Account] = []
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Goal?
    private let originalDraft: GoalDraft

    init(editing goal: Goal? = nil) {
        let start = goal.map(GoalDraft.init(editing:)) ?? GoalDraft()
        original = goal
        draft = start
        originalDraft = start
    }

    var isEditing: Bool { original != nil }
    var canSave: Bool { !isSaving && draft.problem == nil && (!isEditing || draft != originalDraft) }

    func load(using api: Api) async {
        let result: ApiResult<[Account]> = await api.get("accounts")
        if case .ok(let list, _) = result {
            accounts = list.filter { !$0.group.isLiability && !$0.isArchived }
        }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Goal>
        if let original {
            result = await api.patchJSON("goals/\(original.id)", body: draft.patchRequest(from: originalDraft))
        } else {
            result = await api.postJSON("goals", body: draft.createRequest())
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

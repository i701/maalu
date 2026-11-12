import Foundation
import Observation

@MainActor @Observable
final class AcceptSuggestionModel {
    var draft: SuggestionDraft
    let candidate: SubscriptionCandidate
    private(set) var isSaving = false
    private(set) var errorMessage: String?

    init(_ candidate: SubscriptionCandidate) {
        self.candidate = candidate
        draft = SuggestionDraft(candidate)
    }

    var canSave: Bool { !isSaving && draft.problem == nil }

    func accept(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Subscription> = await api.postJSON("subscriptions/candidates/accept", body: draft.request(for: candidate))
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

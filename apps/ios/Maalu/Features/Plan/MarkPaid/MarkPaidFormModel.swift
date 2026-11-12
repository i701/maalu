import Foundation
import Observation

@MainActor @Observable
final class MarkPaidFormModel {
    var draft: MarkPaidDraft
    let planned: Transaction
    let baseCurrency: String
    private(set) var isSaving = false
    private(set) var errorMessage: String?

    init(planned: Transaction, baseCurrency: String) {
        self.planned = planned
        self.baseCurrency = baseCurrency
        draft = MarkPaidDraft(planned: planned, baseCurrency: baseCurrency)
    }

    var canSave: Bool { !isSaving && draft.problem == nil }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Transaction> = await api.postJSON("transactions/\(planned.id)/post", body: draft.request())
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

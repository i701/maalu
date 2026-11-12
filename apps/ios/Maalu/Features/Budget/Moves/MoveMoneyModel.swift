import Foundation
import Observation

@MainActor @Observable
final class MoveMoneyModel {
    var draft = MoveMoneyDraft()
    let sources: [MoveSource]
    private let lineID: String
    private(set) var isSaving = false
    private(set) var errorMessage: String?

    init(lineID: String, budget: Budget) {
        self.lineID = lineID
        sources = MoveSource.sources(in: budget, for: lineID)
    }

    var source: MoveSource? { sources.first { $0.id == draft.sourceID } }
    var problem: LocalizedStringResource? { draft.problem(left: source?.left) }
    var canSave: Bool { !isSaving && problem == nil }

    func save(on date: Date, using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Budget> = await api.postJSON("budget/moves", body: draft.request(to: lineID, on: date))
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

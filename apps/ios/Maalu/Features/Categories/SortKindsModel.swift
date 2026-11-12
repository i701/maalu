import Foundation
import Observation

@MainActor @Observable
final class SortKindsModel {
    var choices: [SortKindChoice]
    var onlyUnsorted = false
    private(set) var isSaving = false
    private(set) var errorMessage: String?

    init(categories: [Category]) {
        choices = categories.map { SortKindChoice(category: $0, kind: $0.effectiveKind) }
    }

    var changedCount: Int { choices.filter { $0.kind != $0.category.kind }.count }

    /// What to change, grouped by the new kind so each group is one bulk request.
    func changes() -> (needs: [String], wants: [String], cleared: [String]) {
        var needs: [String] = []
        var wants: [String] = []
        var cleared: [String] = []
        for choice in choices where choice.kind != choice.category.kind {
            switch choice.kind {
            case .need: needs.append(choice.category.id)
            case .want: wants.append(choice.category.id)
            case nil: cleared.append(choice.category.id)
            }
        }
        return (needs, wants, cleared)
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let changes = changes()
        let requests: [(ids: [String], kind: CategoryKind?)] = [
            (changes.needs, .need),
            (changes.wants, .want),
            (changes.cleared, CategoryKind?.none),
        ]
        for request in requests where !request.ids.isEmpty {
            let result: ApiResult<CategoryKindResult> = await api.patchJSON("categories/kind", body: CategoryKindRequest(ids: request.ids, kind: request.kind))
            if case .failed(_, let message) = result {
                errorMessage = message
                isSaving = false
                return false
            }
        }
        isSaving = false
        return true
    }
}

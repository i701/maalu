import Foundation
import Observation

@MainActor @Observable
final class BudgetLineFormModel {
    var draft: BudgetLineDraft
    private(set) var categories: [CategoryOption] = []
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: BudgetLine?
    private let originalDraft: BudgetLineDraft
    /// Category id → the name of the other limit that already has it.
    private let takenBy: [String: String]

    init(editing line: BudgetLine? = nil, otherLines: [BudgetLine]) {
        let start = line.map(BudgetLineDraft.init(editing:)) ?? BudgetLineDraft()
        original = line
        draft = start
        originalDraft = start
        var taken: [String: String] = [:]
        for other in otherLines where other.id != line?.id {
            for category in other.categories { taken[category.id] = other.name }
        }
        takenBy = taken
    }

    var isEditing: Bool { original != nil }
    var canSave: Bool { !isLoading && !isSaving && draft.problem == nil && (!isEditing || draft != originalDraft) }

    var selectedNames: String {
        categories.filter { draft.categoryIDs.contains($0.id) }.map(\.name).formatted()
    }

    func takenName(of category: CategoryOption) -> String? {
        takenBy[category.id]
    }

    func load(using api: Api) async {
        let result: ApiResult<[CategoryOption]> = await api.get("categories")
        isLoading = false
        if case .ok(let list, _) = result {
            categories = list.filter { !$0.isSalary }
        } else if case .failed(_, let message) = result {
            errorMessage = message
        }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Budget>
        if let original {
            result = await api.patchJSON("budget/lines/\(original.id)", body: draft.patchRequest(from: originalDraft))
        } else {
            result = await api.postJSON("budget/lines", body: draft.createRequest())
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

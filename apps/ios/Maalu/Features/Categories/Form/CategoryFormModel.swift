import Foundation
import Observation

@MainActor @Observable
final class CategoryFormModel {
    var draft: CategoryDraft
    private(set) var categories: [Category] = []
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: Category?

    init(editing category: Category? = nil) {
        original = category
        draft = category.map(CategoryDraft.init(editing:)) ?? CategoryDraft()
    }

    var isEditing: Bool { original != nil }

    /// The default Salary category keeps its name and cannot be nested (but its colour and kind can change).
    var isSalary: Bool { original?.isSalary == true }

    /// A category with sub-categories of its own cannot become one.
    var parentChoices: [Category] {
        CategoryLogic.parentChoices(from: categories, for: original)
    }

    var canSave: Bool { !draft.name.trimmingCharacters(in: .whitespaces).isEmpty && !isSaving }

    func load(using api: Api) async {
        let result: ApiResult<[Category]> = await api.get("categories")
        guard !Task.isCancelled else { return }
        if case .ok(let value, _) = result { categories = value }
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let request = CategoryRequest(name: draft.name.trimmingCharacters(in: .whitespaces), color: draft.color, parentId: draft.parentId, kind: draft.kind)
        let result: ApiResult<Category>
        if let id = draft.id {
            result = await api.patchJSON("categories/\(id)", body: request)
        } else {
            result = await api.postJSON("categories", body: request)
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

import Foundation
import Observation

@MainActor @Observable
final class BudgetLineFormModel {
    var draft: BudgetLineDraft
    private(set) var categories: [CategoryOption] = []
    private(set) var isLoading = true
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let editingID: String?
    private let originalDraft: BudgetLineDraft
    private let lines: [BudgetLine]
    private let fixedLines: [FixedBudgetLine]
    let budgetWarnPercent: Int

    /// `editingID` is the limit being changed; without it the draft is saved as a new limit.
    init(draft: BudgetLineDraft, editingID: String?, budget: Budget) {
        self.draft = draft
        originalDraft = draft
        self.editingID = editingID
        lines = budget.lines
        fixedLines = budget.fixedLines
        budgetWarnPercent = budget.warnPercent
    }

    var isEditing: Bool { editingID != nil }
    var canSave: Bool { !isLoading && !isSaving && draft.problem == nil && (!isEditing || draft != originalDraft) }

    var hasOwnWarnLevel: Bool {
        get { draft.warnPercent != nil }
        set { draft.warnPercent = newValue ? budgetWarnPercent : nil }
    }

    var ownWarnPercent: Int { draft.warnPercent ?? budgetWarnPercent }

    var ownWarnLevel: Double {
        get { Double(ownWarnPercent) }
        set { draft.warnPercent = Int(newValue.rounded()) }
    }

    var selectedNames: String {
        categories.filter { draft.categoryIDs.contains($0.id) }.map(\.name).formatted()
    }

    /// The other limit of the same kind that already has a category. A monthly limit for set dates is left to the server, as on the web.
    func takenName(of category: CategoryOption) -> String? {
        if draft.isOneTotal {
            return fixedLines.first { other in
                other.id != editingID && other.startDate <= draft.endDate && draft.startDate <= other.endDate
                    && other.categories.contains { $0.id == category.id }
            }?.name
        }
        if draft.hasDates { return nil }
        return lines.first { $0.id != editingID && $0.categories.contains { $0.id == category.id } }?.name
    }

    /// The date pickers' days, kept as the API's ISO dates in the draft.
    var pickerStart: Date {
        get { ISODate.date(draft.startDate) ?? .now }
        set { draft.startDate = ISODate.string(newValue) }
    }

    var pickerEnd: Date {
        get { ISODate.date(draft.endDate) ?? .now }
        set { draft.endDate = ISODate.string(newValue) }
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
        if let editingID {
            result = await api.patchJSON("budget/lines/\(editingID)", body: draft.patchRequest(from: originalDraft))
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

import Foundation
import Observation

@MainActor @Observable
final class GroupFormModel {
    var name: String
    var note: String
    var selection: Set<String> = []
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let original: TransactionGroup?

    init(editing group: TransactionGroup? = nil) {
        original = group
        name = group?.name ?? ""
        note = group?.note ?? ""
    }

    var isEditing: Bool { original != nil }

    /// The first thing wrong, or nil when it can be saved. The server checks it all again.
    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the group a name." }
        if !isEditing && selection.count < TransactionGroup.fewest { return "Choose at least two transactions." }
        return nil
    }

    var canSave: Bool { problem == nil && !isSaving }

    var request: GroupRequest {
        let trimmedNote = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return GroupRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            note: trimmedNote.isEmpty ? nil : trimmedNote,
            transactionIds: isEditing ? nil : selection.sorted()
        )
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<TransactionGroup>
        if let original {
            result = await api.patchJSON("groups/\(original.id)", body: request)
        } else {
            result = await api.postJSON("groups", body: request)
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

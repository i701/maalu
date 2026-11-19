import Foundation
import Observation

@MainActor @Observable
final class GroupsModel {
    private(set) var groups: [TransactionGroup] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var search = ""

    /// What the search leaves, over the name and note as the API's; the list comes whole, so it is done here.
    var visible: [TransactionGroup] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        guard !typed.isEmpty else { return groups }
        return groups.filter { $0.name.localizedStandardContains(typed) || $0.note?.localizedStandardContains(typed) == true }
    }

    func load(using api: Api) async {
        let result: ApiResult<[TransactionGroup]> = await api.get("groups")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            groups = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

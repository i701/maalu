import Foundation
import Observation

@MainActor @Observable
final class TagsModel {
    private(set) var tags: [TagRecord] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var search = ""

    /// What the search leaves; the list is small, so it is done here.
    var visible: [TagRecord] {
        let typed = search.trimmingCharacters(in: .whitespaces)
        return typed.isEmpty ? tags : tags.filter { $0.name.localizedStandardContains(typed) }
    }

    func mergeTargets(for tag: TagRecord) -> [TagRecord] {
        tags.filter { $0.id != tag.id }
    }

    func load(using api: Api) async {
        let result: ApiResult<[TagRecord]> = await api.get("tags")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            tags = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Adds a tag, or with `tag` renames it; every transaction and template with it follows. Returns a message when the server refused.
    func save(name: String, renaming tag: TagRecord?, using api: Api) async -> String? {
        let typed = name.trimmingCharacters(in: .whitespaces)
        guard !typed.isEmpty else { return String(localized: "Give the tag a name.") }
        let result: ApiResult<TagRecord>
        if let tag {
            result = await api.patchJSON("tags/\(tag.id)", body: ["name": typed])
        } else {
            result = await api.postJSON("tags", body: ["name": typed])
        }
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil on success.
    func delete(_ tag: TagRecord, using api: Api) async -> String? {
        let result = await api.delete("tags/\(tag.id)")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil on success.
    func merge(_ tag: TagRecord, into target: TagRecord, using api: Api) async -> String? {
        let result: ApiResult<TagRecord> = await api.postJSON("tags/\(tag.id)/merge", body: MergeRequest(intoId: target.id))
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }
}

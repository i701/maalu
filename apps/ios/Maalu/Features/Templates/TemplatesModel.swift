import Foundation
import Observation

@MainActor @Observable
final class TemplatesModel {
    private(set) var templates: [TransactionTemplate] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    func load(using api: Api) async {
        let result: ApiResult<[TransactionTemplate]> = await api.get("templates")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            templates = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Returns a message when the server refused, nil on success.
    func rename(_ template: TransactionTemplate, to name: String, using api: Api) async -> String? {
        let result: ApiResult<TransactionTemplate> = await api.patchJSON(
            "templates/\(template.id)",
            body: TemplateRename(name: name.trimmingCharacters(in: .whitespaces))
        )
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return nil
    }

    /// Returns a message when the server refused, nil on success.
    func delete(_ template: TransactionTemplate, using api: Api) async -> String? {
        let result = await api.delete("templates/\(template.id)")
        if case .failed(_, let message) = result { return message }
        templates.removeAll { $0.id == template.id }
        return nil
    }
}

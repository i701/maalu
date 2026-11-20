import Foundation
import Observation

@MainActor @Observable
final class SessionsModel {
    private(set) var sessions: [DeviceSession] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    var otherCount: Int { sessions.filter { !$0.current }.count }

    func load(using api: Api) async {
        let result: ApiResult<[DeviceSession]> = await api.get("auth/sessions")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            sessions = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    func end(_ session: DeviceSession, using api: Api) async {
        let result = await api.delete("auth/sessions/\(session.id)")
        if case .failed(_, let message) = result { errorMessage = message; return }
        sessions.removeAll { $0.id == session.id }
        errorMessage = nil
    }

    func endOthers(using api: Api) async {
        let result: ApiResult<EndedSessions> = await api.post("auth/sessions/end-others")
        if case .failed(_, let message) = result { errorMessage = message; return }
        sessions.removeAll { !$0.current }
        errorMessage = nil
    }
}

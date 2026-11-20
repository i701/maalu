import Foundation
import Observation

@MainActor @Observable
final class TwoFactorSetupModel {
    private(set) var setup: TwoFactorSetup?
    private(set) var isBusy = false
    private(set) var errorMessage: String?
    var code = ""

    var canEnable: Bool { setup != nil && code.trimmingCharacters(in: .whitespaces).count >= 6 && !isBusy }

    /// Starting twice gives the same secret, so reopening the sheet is safe.
    func start(using api: Api) async {
        let result: ApiResult<TwoFactorSetup> = await api.post("auth/2fa/setup")
        guard !Task.isCancelled else { return }
        switch result {
        case .ok(let value, _): setup = value
        case .failed(_, let message): errorMessage = message
        }
    }

    /// The recovery codes when the code was right; nil with a message otherwise.
    func enable(using api: Api) async -> [String]? {
        isBusy = true
        defer { isBusy = false }
        let result: ApiResult<RecoveryCodes> = await api.postJSON("auth/2fa/enable", body: ["code": code.trimmingCharacters(in: .whitespaces)])
        switch result {
        case .ok(let value, _):
            errorMessage = nil
            return value.recoveryCodes
        case .failed(_, let message):
            errorMessage = message
            return nil
        }
    }
}

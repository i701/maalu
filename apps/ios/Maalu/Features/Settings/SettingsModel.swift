import Foundation
import Observation

@MainActor @Observable
final class SettingsModel {
    private(set) var settings: UserSettings?
    private(set) var accounts: [Account] = []
    private(set) var canEmail = false
    private(set) var errorMessage: String?

    func load(using api: Api) async {
        async let meResult: ApiResult<UserSettings> = api.get("users/me")
        async let accountsResult: ApiResult<[Account]> = api.get("accounts")
        async let emailResult: ApiResult<EmailStatus> = api.get("email/status")
        let (me, accounts, email) = await (meResult, accountsResult, emailResult)
        guard !Task.isCancelled else { return }
        // the account list and email status are extras: the switches stand without them
        if case .ok(let value, _) = accounts { self.accounts = value }
        if case .ok(let value, _) = email { canEmail = value.configured }
        switch me {
        case .ok(let value, _):
            settings = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Shows the change at once, asks the server, and puts the old value back with a message if it refuses.
    func save<Value: Encodable & Sendable>(_ key: String, _ value: Value, change: (inout UserSettings) -> Void, using api: Api) async {
        guard let before = settings else { return }
        var after = before
        change(&after)
        settings = after
        let result: ApiResult<UserSettings> = await api.patchJSON("users/me", body: [key: value])
        switch result {
        case .ok(let saved, _):
            settings = saved
            errorMessage = nil
        case .failed(_, let message):
            settings = before
            errorMessage = message
        }
    }
}

import Foundation

/// The "short numbers" setting lives on the account (`compact_numbers`); the device keeps a copy so amounts can read it.
@MainActor
enum ShortNumbers {
    /// Takes the account's setting, so a change made on the web or Android shows here too.
    static func sync(using api: Api) async {
        let result: ApiResult<Profile> = await api.get("users/me")
        if case .ok(let profile, _) = result {
            UserDefaults.standard.set(profile.compactNumbers, forKey: MoneyFormat.shortKey)
        }
    }

    /// Saves the setting on the account; returns a message when the server refused, and the device copy is then put back.
    static func save(_ on: Bool, using api: Api) async -> String? {
        UserDefaults.standard.set(on, forKey: MoneyFormat.shortKey)
        let result: ApiResult<Profile> = await api.patchJSON("users/me", body: ["compact_numbers": on])
        guard case .failed(_, let message) = result else { return nil }
        UserDefaults.standard.set(!on, forKey: MoneyFormat.shortKey)
        return message
    }
}

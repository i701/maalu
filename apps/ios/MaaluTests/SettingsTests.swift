import Foundation
import Testing
@testable import Maalu

struct SettingsTests {
    @Test func theAccountSettingsDecode() throws {
        let json = #"{"id":"u","email":"a@b.c","base_currency":"MVR","default_account_id":null,"start_from_template":true,"notify_payments":true,"notify_budget":false,"notify_goals":true,"notify_email":false,"notify_login":true,"compact_numbers":false,"dashboard_order":null,"two_factor_enabled":false,"created_at":"2026-01-01T00:00:00Z"}"#
        let settings = try Api.decoder.decode(UserSettings.self, from: Data(json.utf8))
        #expect(settings.email == "a@b.c")
        #expect(settings.defaultAccountId == nil)
        #expect(!settings.notifyBudget)
    }

    @Test func clearingTheDefaultAccountSendsNull() throws {
        let body: [String: String?] = ["default_account_id": nil]
        let json = try String(decoding: JSONEncoder().encode(body), as: UTF8.self)
        #expect(json == #"{"default_account_id":null}"#)
    }
}

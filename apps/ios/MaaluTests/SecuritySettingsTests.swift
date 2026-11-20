import Foundation
import Testing
@testable import Maalu

struct SecuritySettingsTests {
    @Test func aDeviceIsNamedFromItsUserAgent() {
        #expect(DeviceName.describe("Maalu-iOS/0.1") == "Maalu app on iOS")
        #expect(DeviceName.describe("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15") == "Safari on macOS")
        #expect(DeviceName.describe("Mozilla/5.0 (Windows NT 10.0) Chrome/120.0 Safari/537.36 Edg/120.0") == "Edge on Windows")
        #expect(DeviceName.describe(nil) == "Unknown device")
        #expect(DeviceName.describe("  ") == "Unknown device")
    }

    @Test func aTimeReadsAsHowLongAgo() {
        let now = Date(timeIntervalSince1970: 1_800_000_000)
        let iso = ISO8601DateFormatter()
        #expect(DeviceName.ago(iso.string(from: now.addingTimeInterval(-10)), now: now) == "just now")
        #expect(DeviceName.ago("soon", now: now) == "soon")
    }

    @Test func theNewPasswordNeedsEightCharactersAndTypingTwice() {
        var draft = PasswordDraft(needsCode: false)
        draft.current = "old"
        draft.new = "short"
        #expect(!draft.canSubmit)
        #expect(draft.problem != nil)
        draft.new = "longenough"
        draft.confirm = "different"
        #expect(!draft.canSubmit)
        draft.confirm = "longenough"
        #expect(draft.canSubmit)
        #expect(draft.problem == nil)
    }

    @Test func theCodeCountsOnlyWhenTwoFactorIsOn() {
        var draft = PasswordDraft(needsCode: true)
        draft.current = "old"
        draft.new = "longenough"
        draft.confirm = "longenough"
        #expect(!draft.canSubmit)
        draft.code = "123456"
        #expect(draft.canSubmit)
        #expect(draft.request.code == "123456")
        var plain = draft
        plain = PasswordDraft(needsCode: false)
        #expect(plain.request.code == nil)
    }
}

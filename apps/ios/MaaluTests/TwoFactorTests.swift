import Foundation
import Testing
@testable import Maalu

struct TwoFactorTests {
    @Test func theSetupAndRecoveryCodesDecode() throws {
        let setup = #"{"secret":"ABCD","otpauth_uri":"otpauth://totp/Maalu:a@b.c?secret=ABCD","qr_data_uri":"data:image/svg+xml;base64,AA=="}"#
        let decoded = try Api.decoder.decode(TwoFactorSetup.self, from: Data(setup.utf8))
        #expect(decoded.secret == "ABCD")
        #expect(decoded.otpauthUri.hasPrefix("otpauth://"))
        let codes = try Api.decoder.decode(RecoveryCodes.self, from: Data(#"{"recovery_codes":["a","b"]}"#.utf8))
        #expect(codes.recoveryCodes == ["a", "b"])
    }

    @Test func aQRCodeIsDrawnFromTheLink() {
        #expect(QRCode.image(for: "otpauth://totp/Maalu:a@b.c?secret=ABCD") != nil)
    }
}

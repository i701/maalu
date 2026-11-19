import Foundation
import Testing
@testable import Maalu

@MainActor
struct LoginTests {
    private func token(_ json: String) throws -> Token {
        try Api.decoder.decode(Token.self, from: Data(json.utf8))
    }

    @Test func aPasswordAloneSignsInWhenTwoFactorIsOff() throws {
        let model = LoginModel()
        #expect(model.received(try token(#"{"access_token":"s","challenge_token":null,"two_factor_required":false}"#)) == "s")
        #expect(!model.needsCode)
    }

    @Test func twoFactorAsksForACodeOfEitherKind() throws {
        let model = LoginModel()
        model.email = "a@b.co"
        model.password = "secret"
        #expect(model.canSubmit)
        #expect(model.received(try token(#"{"access_token":null,"challenge_token":"c","two_factor_required":true}"#)) == nil)
        #expect(model.needsCode)
        #expect(!model.canSubmit)
        model.code = "123456"
        #expect(model.canSubmit)
        model.switchCodeKind()
        #expect(model.usesRecoveryCode)
        #expect(model.code.isEmpty)
    }

    @Test func aWrongCodeStaysButAnExpiredSignInStartsAgain() throws {
        let model = LoginModel()
        model.email = "a@b.co"
        _ = model.received(try token(#"{"access_token":null,"challenge_token":"c","two_factor_required":true}"#))
        model.failed(with: "That code is not right")
        #expect(model.needsCode)
        #expect(model.errorMessage == "That code is not right")
        model.failed(with: "Sign in again")
        #expect(!model.needsCode)
        #expect(model.email == "a@b.co")
        #expect(model.errorMessage != nil)
    }

    @Test func backToSignInKeepsTheEmail() throws {
        let model = LoginModel()
        model.email = "a@b.co"
        _ = model.received(try token(#"{"access_token":null,"challenge_token":"c","two_factor_required":true}"#))
        model.code = "12"
        model.backToPassword()
        #expect(!model.needsCode)
        #expect(model.code.isEmpty)
        #expect(model.email == "a@b.co")
        #expect(model.errorMessage == nil)
    }
}

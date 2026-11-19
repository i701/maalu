import Foundation
import Observation

@MainActor @Observable
final class LoginModel {
    var email = ""
    var password = ""
    var code = ""
    /// The second step takes a recovery code instead of the authenticator app's 6 digits.
    private(set) var usesRecoveryCode = false
    private(set) var challenge: String?
    private(set) var isBusy = false
    private(set) var errorMessage: String?

    /// What the API says when the five-minute challenge ran out or is no good.
    private static let expired = "Sign in again"

    var needsCode: Bool { challenge != nil }

    var canSubmit: Bool {
        guard !isBusy else { return false }
        if needsCode { return !code.trimmingCharacters(in: .whitespaces).isEmpty }
        return !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty
    }

    func submit(using session: Session) async {
        guard let api = session.api else { return }
        isBusy = true
        errorMessage = nil
        let result: ApiResult<Token>
        if let challenge {
            let request = TwoFactorRequest(challengeToken: challenge, code: code.trimmingCharacters(in: .whitespaces))
            result = await api.postJSON("auth/login/2fa", body: request)
        } else {
            let fields = ["username": email.trimmingCharacters(in: .whitespaces), "password": password]
            result = await api.postForm("auth/login", fields: fields)
        }
        isBusy = false
        switch result {
        case .ok(let token, _):
            if let accessToken = received(token) { session.signedIn(token: accessToken) }
        case .failed(_, let message):
            failed(with: message)
        }
    }

    /// The session token when signing in is done, or nil when the second step is still to come.
    func received(_ token: Token) -> String? {
        if let accessToken = token.accessToken { return accessToken }
        if token.twoFactorRequired {
            challenge = token.challengeToken
            code = ""
            usesRecoveryCode = false
        }
        return nil
    }

    func failed(with message: String) {
        if needsCode && message == Self.expired {
            backToPassword(saying: String(localized: "That sign-in timed out. Start again."))
        } else {
            errorMessage = message
        }
    }

    func switchCodeKind() {
        usesRecoveryCode.toggle()
        code = ""
        errorMessage = nil
    }

    /// Back to the email and password, which are kept; a new challenge is needed.
    func backToPassword(saying message: String? = nil) {
        challenge = nil
        code = ""
        usesRecoveryCode = false
        errorMessage = message
    }
}

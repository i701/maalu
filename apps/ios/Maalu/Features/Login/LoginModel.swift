import Observation

@MainActor @Observable
final class LoginModel {
    var email = ""
    var password = ""
    var code = ""
    private(set) var challenge: String?
    private(set) var isBusy = false
    private(set) var errorMessage: String?

    var needsCode: Bool { challenge != nil }

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
        handle(result, session: session)
    }

    private func handle(_ result: ApiResult<Token>, session: Session) {
        switch result {
        case .ok(let token, _):
            if let accessToken = token.accessToken {
                session.signedIn(token: accessToken)
            } else if token.twoFactorRequired {
                challenge = token.challengeToken
            }
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

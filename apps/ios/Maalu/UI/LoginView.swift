import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @State private var email = ""
    @State private var password = ""
    @State private var challenge: String?
    @State private var code = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                if challenge == nil {
                    Section("Sign in to \(session.server ?? "")") {
                        TextField("Email", text: $email)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                        SecureField("Password", text: $password).textContentType(.password)
                    }
                } else {
                    Section("Two-factor code") {
                        TextField("6-digit code or recovery code", text: $code)
                            .textContentType(.oneTimeCode)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
                }
                if let error { Text(error).foregroundStyle(.red) }
                Button(busy ? "Signing in…" : "Sign in") { challenge == nil ? signIn() : verify() }
                    .disabled(busy)
                Button("Use a different server", role: .destructive) { session.clearServer() }
            }
            .navigationTitle("Maalu")
        }
    }

    private func signIn() {
        guard let api = session.api else { return }
        run { finish(await api.postForm("auth/login", ["username": email.trimmingCharacters(in: .whitespaces), "password": password])) }
    }

    private func verify() {
        guard let api = session.api, let challenge else { return }
        run { finish(await api.postJSON("auth/login/2fa", TwoFactorBody(challengeToken: challenge, code: code.trimmingCharacters(in: .whitespaces)))) }
    }

    private func run(_ work: @escaping () async -> Void) {
        busy = true
        error = nil
        Task { await work(); busy = false }
    }

    @MainActor private func finish(_ result: ApiResult<Token>) {
        switch result {
        case .ok(let t, _):
            if let token = t.accessToken { session.signedIn(token: token) }
            else if t.twoFactorRequired { challenge = t.challengeToken }
        case .failed(_, let message):
            error = message
        }
    }
}

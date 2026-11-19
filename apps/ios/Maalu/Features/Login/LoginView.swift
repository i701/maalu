import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @State private var model = LoginModel()

    var body: some View {
        NavigationStack {
            Form {
                if model.needsCode {
                    TwoFactorCodeSection(model: model)
                } else {
                    Section("Sign in to \(session.server ?? "")") {
                        TextField("Email", text: $model.email)
                            .textContentType(.username)
                            .textInputAutocapitalization(.never)
                            .keyboardType(.emailAddress)
                            .autocorrectionDisabled()
                        SecureField("Password", text: $model.password)
                            .textContentType(.password)
                    }
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
                Button(submitTitle, action: submit)
                    .disabled(!model.canSubmit)
                if model.needsCode {
                    Button(model.usesRecoveryCode ? "Use my authenticator app" : "Use a recovery code instead", action: model.switchCodeKind)
                    Button("Back to sign in", action: back)
                } else {
                    Button("Use a different server", role: .destructive, action: session.clearServer)
                }
            }
            .navigationTitle("Maalu")
        }
    }

    private var submitTitle: LocalizedStringKey {
        if model.isBusy { return model.needsCode ? "Verifying…" : "Signing in…" }
        return model.needsCode ? "Verify" : "Sign in"
    }

    private func submit() {
        Task { await model.submit(using: session) }
    }

    private func back() {
        model.backToPassword()
    }
}

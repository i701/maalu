import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @State private var model = LoginModel()

    var body: some View {
        NavigationStack {
            Form {
                if model.needsCode {
                    Section("Two-factor code") {
                        TextField("6-digit code or recovery code", text: $model.code)
                            .textContentType(.oneTimeCode)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                    }
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
                Button(model.isBusy ? "Signing in…" : "Sign in", action: submit)
                    .disabled(model.isBusy)
                Button("Use a different server", role: .destructive, action: session.clearServer)
            }
            .navigationTitle("Maalu")
        }
    }

    private func submit() {
        Task { await model.submit(using: session) }
    }
}

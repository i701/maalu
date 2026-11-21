import SwiftUI

struct LoginView: View {
    @Environment(Session.self) private var session
    @State private var model = LoginModel()

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                AuthHeader()
                if model.needsCode {
                    TwoFactorCodeSection(model: model, onComplete: submit)
                } else {
                    LoginFieldsCard(model: model, server: session.server ?? "")
                }
                if let message = model.errorMessage {
                    Text(message)
                        .font(.callout)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }
                if !(model.needsCode && !model.usesRecoveryCode) {
                    Button(action: submit) {
                        Text(submitTitle).font(.body.weight(.semibold)).frame(maxWidth: .infinity, minHeight: 46)
                    }
                    .buttonStyle(.glassProminent)
                    .tint(.brand)
                    .padding(.horizontal, 12)
                    .disabled(!model.canSubmit)
                }
                if model.needsCode {
                    Button(model.usesRecoveryCode ? "Use my authenticator app" : "Use a recovery code instead", action: model.switchCodeKind)
                    Button("Back to sign in") { model.backToPassword() }
                } else {
                    Button("Use a different server", action: session.clearServer)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal, Spacing.screen)
            .padding(.bottom, 32)
            .frame(maxWidth: .infinity)
        }
        .scrollDismissesKeyboard(.interactively)
        .gradientHeader()
        .tint(.brand)
    }

    private var submitTitle: LocalizedStringKey {
        if model.isBusy { return model.needsCode ? "Verifying…" : "Signing in…" }
        return model.needsCode ? "Verify" : "Sign in"
    }

    private func submit() {
        Task { await model.submit(using: session) }
    }
}

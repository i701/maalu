import SwiftUI

/// The second step of signing in: the authenticator app's 6 digits, or one of the recovery codes.
struct TwoFactorCodeSection: View {
    @Bindable var model: LoginModel

    var body: some View {
        Section {
            if model.usesRecoveryCode {
                TextField("Recovery code", text: $model.code)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
            } else {
                TextField("Authentication code", text: $model.code)
                    .textContentType(.oneTimeCode)
                    .keyboardType(.numberPad)
            }
        } header: {
            Text("Two-factor sign-in")
        } footer: {
            Text(model.usesRecoveryCode
                ? "One of the codes you saved when you turned two-factor on. Each works once."
                : "The 6 digits from your authenticator app.")
        }
    }
}

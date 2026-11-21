import SwiftUI

/// The second step of signing in: the authenticator app's 6 digits in the cells, or one of the recovery codes.
struct TwoFactorCodeSection: View {
    @Bindable var model: LoginModel
    let onComplete: () -> Void

    private var state: OtpState {
        if model.isVerified { return .verified }
        return model.isBusy ? .checking : .typing
    }

    var body: some View {
        VStack(spacing: 14) {
            Text("Two-factor sign-in").font(.headline)
            if model.usesRecoveryCode {
                TextField("Recovery code", text: $model.code)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .padding(Spacing.card)
                    .card()
            } else {
                OtpField(code: $model.code, state: state, failures: model.codeFailures, onComplete: onComplete)
            }
            Text(model.usesRecoveryCode
                ? "One of the codes you saved when you turned two-factor on. Each works once."
                : "The 6 digits from your authenticator app.")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
    }
}

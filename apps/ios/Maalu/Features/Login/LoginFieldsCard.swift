import SwiftUI

/// The email and password on one card.
struct LoginFieldsCard: View {
    @Bindable var model: LoginModel
    let server: String

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Sign in to \(server)")
                .font(.footnote)
                .foregroundStyle(.secondary)
                .padding(.bottom, 10)
            VStack(spacing: 0) {
                TextField("Email", text: $model.email)
                    .textContentType(.username)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
                    .autocorrectionDisabled()
                    .padding(Spacing.card)
                Divider().padding(.leading, Spacing.card)
                SecureField("Password", text: $model.password)
                    .textContentType(.password)
                    .padding(Spacing.card)
            }
            .card()
        }
    }
}

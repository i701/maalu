import SwiftUI

struct ChangePasswordView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var draft: PasswordDraft
    @State private var isSaving = false
    @State private var errorMessage: String?

    init(twoFactor: Bool) {
        _draft = State(initialValue: PasswordDraft(needsCode: twoFactor))
    }

    var body: some View {
        Form {
            Section {
                SecureField("Current password", text: $draft.current).textContentType(.password)
                SecureField("New password", text: $draft.new).textContentType(.newPassword)
                SecureField("New password again", text: $draft.confirm).textContentType(.newPassword)
            } footer: {
                if let message = errorMessage ?? draft.problem {
                    Text(message).foregroundStyle(.red)
                } else {
                    Text("Changing it signs out your other devices.")
                }
            }
            if draft.needsCode {
                Section {
                    TextField("Code", text: $draft.code)
                        .textContentType(.oneTimeCode)
                        .keyboardType(.asciiCapable)
                        .autocorrectionDisabled()
                        .textInputAutocapitalization(.never)
                } footer: {
                    Text("From your authenticator app, or a recovery code.")
                }
            }
        }
        .navigationTitle("Change password")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button("Save", action: save).disabled(!draft.canSubmit || isSaving)
            }
        }
    }

    private func save() {
        isSaving = true
        Task {
            defer { isSaving = false }
            guard let api = session.api else { return }
            let result = await api.postJSONNoContent("auth/password", body: draft.request)
            switch result {
            case .ok: dismiss()
            case .failed(_, let message): errorMessage = message
            }
        }
    }
}

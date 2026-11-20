import SwiftUI

/// Turning two-factor off or making new recovery codes both need your password and a code.
struct TwoFactorConfirmView: View {
    enum Kind {
        case turnOff, newCodes

        var title: LocalizedStringResource { self == .turnOff ? "Turn off two-factor" : "New recovery codes" }
        var button: LocalizedStringResource { self == .turnOff ? "Turn off" : "Make new codes" }
        var note: LocalizedStringResource {
            self == .turnOff
                ? "Signing in will only need your password again. Your other devices are signed out."
                : "The codes you have now stop working. Your other devices are signed out."
        }
    }

    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var password = ""
    @State private var code = ""
    @State private var isBusy = false
    @State private var errorMessage: String?
    let kind: Kind
    /// The new recovery codes, or nil after turning it off.
    let onDone: ([String]?) -> Void

    private var canSubmit: Bool { !password.isEmpty && code.trimmingCharacters(in: .whitespaces).count >= 6 && !isBusy }

    var body: some View {
        Form {
            Section {
                SecureField("Password", text: $password).textContentType(.password)
                TextField("Code", text: $code)
                    .textContentType(.oneTimeCode)
                    .keyboardType(.asciiCapable)
                    .autocorrectionDisabled()
                    .textInputAutocapitalization(.never)
            } footer: {
                if let errorMessage {
                    Text(errorMessage).foregroundStyle(.red)
                } else {
                    Text(kind.note) + Text(" The code is from your authenticator app, or a recovery code.")
                }
            }
        }
        .navigationTitle(String(localized: kind.title))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            ToolbarItem(placement: .confirmationAction) {
                Button(String(localized: kind.button), role: kind == .turnOff ? .destructive : nil, action: submit).disabled(!canSubmit)
            }
        }
    }

    private func submit() {
        isBusy = true
        Task {
            defer { isBusy = false }
            guard let api = session.api else { return }
            let body = TwoFactorConfirm(password: password, code: code.trimmingCharacters(in: .whitespaces))
            switch kind {
            case .turnOff:
                switch await api.postJSONNoContent("auth/2fa/disable", body: body) {
                case .ok: onDone(nil)
                case .failed(_, let message): errorMessage = message
                }
            case .newCodes:
                let result: ApiResult<RecoveryCodes> = await api.postJSON("auth/2fa/recovery-codes", body: body)
                switch result {
                case .ok(let value, _): onDone(value.recoveryCodes)
                case .failed(_, let message): errorMessage = message
                }
            }
        }
    }
}

struct TwoFactorConfirm: Encodable {
    let password: String
    let code: String
}

/// The change-password form: the current password, the new one typed twice, and a code when two-factor is on.
struct PasswordDraft {
    var current = ""
    var new = ""
    var confirm = ""
    var code = ""
    let needsCode: Bool

    /// What is wrong with it, nil when it can be sent. Silent while the form is untouched.
    var problem: String? {
        if current.isEmpty || new.isEmpty { return nil }
        if new.count < 8 { return "The new password needs at least 8 characters." }
        if new != confirm && !confirm.isEmpty { return "The two new passwords are not the same." }
        return nil
    }

    var canSubmit: Bool {
        !current.isEmpty && new.count >= 8 && new == confirm && (!needsCode || code.trimmingCharacters(in: .whitespaces).count >= 6)
    }

    var request: PasswordRequest {
        PasswordRequest(currentPassword: current, newPassword: new, code: needsCode ? code.trimmingCharacters(in: .whitespaces) : nil)
    }
}

struct PasswordRequest: Encodable {
    let currentPassword: String
    let newPassword: String
    let code: String?
}

/// The secret for an authenticator app. The server also sends the QR as an SVG, which iOS does not use: it draws its own from `otpauthUri`.
struct TwoFactorSetup: Decodable {
    let secret: String
    let otpauthUri: String
}

/// Shown once, each works once in place of an authenticator code.
struct RecoveryCodes: Decodable {
    let recoveryCodes: [String]
}

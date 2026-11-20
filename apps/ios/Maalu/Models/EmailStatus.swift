/// Whether the server can send email, so the email switches are only offered when they would do something.
struct EmailStatus: Decodable {
    let configured: Bool
}

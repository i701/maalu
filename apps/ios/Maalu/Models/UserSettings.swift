/// The account's own settings, as `GET /users/me` returns them.
struct UserSettings: Decodable {
    var email: String
    var defaultAccountId: String?
    var startFromTemplate: Bool
    var notifyPayments: Bool
    var notifyBudget: Bool
    var notifyGoals: Bool
    var notifyEmail: Bool
    var notifyLogin: Bool
}

import Foundation

// Hand-written for the few endpoints used so far; money stays a String on the wire.
// Later these come from apps/web/openapi.json.

struct Token: Decodable {
    var accessToken: String?
    var challengeToken: String?
    var twoFactorRequired: Bool = false
}

struct TwoFactorBody: Encodable {
    var challengeToken: String
    var code: String
}

struct Account: Decodable, Identifiable {
    var id: String
    var name: String
    var group: String
    var currency: String
    var balance: String
    var baseBalance: String
    var bank: String?
    var accountNumber: String?
}

struct UserMe: Decodable {
    var id: String
    var email: String
    var baseCurrency: String
}

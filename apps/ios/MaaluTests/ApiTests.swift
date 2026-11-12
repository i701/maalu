import Foundation
import Testing
@testable import Maalu

struct ApiTests {
    @Test func messageReadsFastApiDetail() {
        #expect(Api.message(from: Data(#"{"detail":"Nope"}"#.utf8), status: 422) == "Nope")
        #expect(Api.message(from: Data(#"{"detail":[{"msg":"bad"}]}"#.utf8), status: 422) == "bad")
    }

    @Test func messageFallsBackByStatus() {
        #expect(Api.message(from: Data(), status: 429) == "Too many attempts. Try again in a few minutes.")
    }

    @Test func decodesServerInfo() throws {
        let json = Data(#"{"app":"maalu","version":"0.1.0","registration_open":false}"#.utf8)
        let info = try Api.decoder.decode(ServerInfo.self, from: json)
        #expect(info.app == "maalu")
        #expect(!info.registrationOpen)
    }
}

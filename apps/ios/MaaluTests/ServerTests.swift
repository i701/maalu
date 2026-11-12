import XCTest
@testable import Maalu

final class ServerTests: XCTestCase {
    func testNormalizeAddsHttpsAndDropsTrailingSlash() {
        XCTAssertEqual(normalizeServer("maalu.example.com/"), "https://maalu.example.com")
        XCTAssertEqual(normalizeServer(" http://localhost:8000 "), "http://localhost:8000")
    }

    func testDetailReadsFastApiErrors() {
        XCTAssertEqual(Api.detail(Data(#"{"detail":"Nope"}"#.utf8), code: 422), "Nope")
        XCTAssertEqual(Api.detail(Data(#"{"detail":[{"msg":"bad"}]}"#.utf8), code: 422), "bad")
        XCTAssertEqual(Api.detail(Data(), code: 429), "Too many attempts. Try again in a few minutes.")
    }
}

final class ServerInfoTests: XCTestCase {
    func testDecodesServerInfo() throws {
        let json = Data(#"{"app":"maalu","version":"0.1.0","registration_open":false}"#.utf8)
        let info = try Api.decoder.decode(ServerInfo.self, from: json)
        XCTAssertEqual(info.app, "maalu")
        XCTAssertFalse(info.registrationOpen)
    }
}

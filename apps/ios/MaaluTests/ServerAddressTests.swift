import Testing
@testable import Maalu

struct ServerAddressTests {
    @Test func normalizedAddsHttpsAndDropsTrailingSlash() {
        #expect(ServerAddress.normalized("maalu.example.com/") == "https://maalu.example.com")
        #expect(ServerAddress.normalized(" http://localhost:8000 ") == "http://localhost:8000")
    }
}

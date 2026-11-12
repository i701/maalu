import Testing
@testable import Maalu

struct ServerAddressTests {
    @Test func normalizedAddsHttpsAndDropsTrailingSlash() {
        #expect(ServerAddress.normalized("maalu.example.com/") == "https://maalu.example.com")
        #expect(ServerAddress.normalized("127.0.0.1:8000") == "https://127.0.0.1:8000")
    }

    @Test func localhostBecomesTheIpv4Loopback() {
        #expect(ServerAddress.normalized(" http://localhost:8000 ") == "http://127.0.0.1:8000")
        #expect(ServerAddress.normalized("localhost:8000") == "https://127.0.0.1:8000")
        #expect(ServerAddress.normalized("https://localhost") == "https://127.0.0.1")
    }
}

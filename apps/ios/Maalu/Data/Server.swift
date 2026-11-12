import Foundation

/// `maalu.example.com` becomes `https://maalu.example.com`; trailing slashes go.
func normalizeServer(_ input: String) -> String {
    var s = input.trimmingCharacters(in: .whitespacesAndNewlines)
    while s.hasSuffix("/") { s.removeLast() }
    return s.hasPrefix("http://") || s.hasPrefix("https://") ? s : "https://\(s)"
}

/// What `GET /api/v1/server` says about a Maalu server. It needs no sign-in.
struct ServerInfo: Decodable {
    var app: String
    var version: String
    var registrationOpen: Bool
}

/// Is there a Maalu server at this address? Asks `GET {server}/api/v1/server`, which says so itself. Returns nil when
/// one answers, else a message.
func checkServer(_ server: String) async -> String? {
    func get(_ path: String) async throws -> (Int, Data) {
        guard let url = URL(string: server + path) else { throw URLError(.badURL) }
        var r = URLRequest(url: url, timeoutInterval: 8)
        r.setValue("Maalu-iOS/0.1", forHTTPHeaderField: "User-Agent")
        let (data, resp) = try await URLSession.shared.data(for: r)
        return ((resp as? HTTPURLResponse)?.statusCode ?? 0, data)
    }
    do {
        let (code, body) = try await get("/api/v1/server")
        let info = code == 200 ? try? Api.decoder.decode(ServerInfo.self, from: body) : nil
        return info?.app == "maalu" ? nil : "That address answered, but it does not look like a Maalu server (\(code))."
    } catch let e as URLError where e.code == .badURL {
        return "That does not look like an address."
    } catch {
        return "Cannot reach the server. Check the address and your connection."
    }
}

import Foundation

enum ServerAddress {
    /// `maalu.example.com` becomes `https://maalu.example.com`; trailing slashes go, and `localhost`
    /// becomes `127.0.0.1` (uvicorn listens on IPv4 only, so a connection the simulator sends to
    /// `::1` is refused).
    static func normalized(_ input: String) -> String {
        var address = input.trimmingCharacters(in: .whitespacesAndNewlines)
        while address.hasSuffix("/") { address.removeLast() }
        var url = address.hasPrefix("http://") || address.hasPrefix("https://") ? address : "https://\(address)"
        if var components = URLComponents(string: url), components.host == "localhost" {
            components.host = "127.0.0.1"
            url = components.url?.absoluteString ?? url
        }
        return url
    }

    /// Nil when a Maalu server answers at this address, else a message for the person.
    static func check(_ server: String) async -> String? {
        guard let url = URL(string: server + "/api/v1/server") else { return "That does not look like an address." }
        var request = URLRequest(url: url, timeoutInterval: 8)
        request.setValue("Maalu-iOS/0.1", forHTTPHeaderField: "User-Agent")
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            let status = (response as? HTTPURLResponse)?.statusCode ?? 0
            let info = status == 200 ? try? Api.decoder.decode(ServerInfo.self, from: data) : nil
            return info?.app == "maalu" ? nil : "That address answered, but it does not look like a Maalu server (\(status))."
        } catch {
            return "Cannot reach the server. Check the address and your connection."
        }
    }
}

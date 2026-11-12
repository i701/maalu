import Foundation
import Observation

@MainActor @Observable
final class Session {
    private(set) var server: String? = Keychain.read("server").map(ServerAddress.normalized)
    private(set) var token: String? = Keychain.read("token")

    var api: Api? {
        guard let server else { return nil }
        return Api(server: server, token: token) { [weak self] in
            Task { @MainActor in self?.signOutLocally() }
        }
    }

    func setServer(_ url: String) {
        let normalized = ServerAddress.normalized(url)
        server = normalized
        Keychain.write("server", normalized)
    }

    func clearServer() {
        signOutLocally()
        server = nil
        Keychain.delete("server")
    }

    func signedIn(token: String) {
        self.token = token
        Keychain.write("token", token)
    }

    func signOut() async {
        _ = await api?.post("auth/logout")
        signOutLocally()
    }

    private func signOutLocally() {
        token = nil
        Keychain.delete("token")
    }
}

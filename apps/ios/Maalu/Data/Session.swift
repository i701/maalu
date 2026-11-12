import Foundation
import Observation

/// Where the app is: which server, and whether someone is signed in. Persisted in the Keychain.
@Observable
final class Session {
    var server: String? = Keychain.read("server")
    var token: String? = Keychain.read("token")

    var api: Api? {
        guard let server else { return nil }
        return Api(server: server, token: token, onSignedOut: { [weak self] in
            Task { @MainActor in self?.signOutLocally() }
        })
    }

    func setServer(_ url: String) {
        server = url
        Keychain.write("server", url)
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

    func signOutLocally() {
        token = nil
        Keychain.delete("token")
    }

    /// Ends the session on the server too, then forgets it here.
    func signOut() async {
        _ = await api?.post("auth/logout")
        signOutLocally()
    }
}

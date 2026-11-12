import Observation

@MainActor @Observable
final class ServerModel {
    var address = ""
    private(set) var isChecking = false
    private(set) var errorMessage: String?

    var canConnect: Bool {
        !isChecking && !address.trimmingCharacters(in: .whitespaces).isEmpty
    }

    func connect(using session: Session) async {
        let server = ServerAddress.normalized(address)
        isChecking = true
        errorMessage = await ServerAddress.check(server)
        isChecking = false
        if errorMessage == nil { session.setServer(server) }
    }
}

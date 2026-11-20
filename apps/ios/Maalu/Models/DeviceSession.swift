/// One sign-in of yours, for the list of where you are signed in.
struct DeviceSession: Decodable, Identifiable {
    let id: String
    let lastUsedAt: String
    let userAgent: String?
    let ipAddress: String?
    let current: Bool
}

struct EndedSessions: Decodable {
    let ended: Int
}

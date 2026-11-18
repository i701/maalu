import Foundation

/// A file picked for a new transaction, sent once the transaction exists.
struct PendingAttachment: Identifiable {
    let id = UUID()
    let filename: String
    let data: Data
    let contentType: String

    static let maxBytes = 10 * 1024 * 1024
    static let maxCount = 10

    /// Why the file cannot be added next to the ones already picked, or nil when it can.
    static func problem(adding data: Data, to pending: [PendingAttachment]) -> LocalizedStringResource? {
        if pending.count >= maxCount { return "A transaction takes at most 10 files." }
        if data.count > maxBytes { return "A file can be at most 10 MB." }
        return nil
    }
}

/// What a bulk request did: how many changed, and which were left alone and why.
struct BulkResult: Decodable {
    struct Skipped: Decodable {
        let id: String
        let reason: String
    }

    let updated: Int
    let skipped: [Skipped]

    /// The results of several requests as one.
    static func merged(_ results: [BulkResult]) -> BulkResult {
        BulkResult(updated: results.reduce(0) { $0 + $1.updated }, skipped: results.flatMap(\.skipped))
    }

    /// "Updated 3 transactions", plus how many were left alone and why ("Updated 2 transactions. 1 skipped: …").
    func message(done: (Int) -> String) -> String {
        let head = done(updated)
        guard !skipped.isEmpty else { return head }
        var reasons: [String] = []
        for reason in skipped.map(\.reason) where !reasons.contains(reason) { reasons.append(reason) }
        return "\(head). \(skipped.count) skipped: \(reasons.joined(separator: "; "))"
    }
}

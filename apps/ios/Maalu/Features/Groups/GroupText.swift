import Foundation

enum GroupText {
    /// "3 Nov – 19 Nov 2026", one day when they match, or nil with no members.
    static func dates(from: String?, to: String?) -> String? {
        guard let start = from.flatMap(ISODate.date), let end = to.flatMap(ISODate.date) else { return nil }
        if from == to { return start.formatted(.dateTime.day().month(.abbreviated).year()) }
        return (start..<end).formatted(.interval.day().month(.abbreviated).year())
    }
}

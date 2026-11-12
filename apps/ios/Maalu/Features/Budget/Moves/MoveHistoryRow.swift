import SwiftUI

struct MoveHistoryRow: View {
    let move: BudgetMove
    let lineID: String
    let currency: String

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if let text = MoveText.describe(move, from: lineID, currency: currency) {
                Text(text).strikethrough(move.undoneAt != nil)
            }
            if let note = move.note, !note.isEmpty {
                Text(note).font(.subheadline).foregroundStyle(.secondary)
            }
            Text(footer).font(.subheadline).foregroundStyle(.secondary)
        }
    }

    private var footer: String {
        let made = Self.stamp(move.createdAt)
        guard let undone = move.undoneAt else { return String(localized: "Made \(made)") }
        return String(localized: "Made \(made) · Undone \(Self.stamp(undone))")
    }

    private static func stamp(_ iso: String) -> String {
        (try? Date(iso, strategy: .iso8601))?.formatted(.dateTime.day().month(.abbreviated).hour().minute()) ?? iso
    }
}

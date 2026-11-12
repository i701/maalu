import Foundation

struct GoalMoneyDraft {
    enum Direction: String, CaseIterable, Identifiable {
        case add, take

        var id: String { rawValue }

        var title: LocalizedStringResource {
            switch self {
            case .add: "Set aside"
            case .take: "Take out"
            }
        }
    }

    var direction = Direction.add
    var amount: Decimal?
    var note = ""

    var problem: LocalizedStringResource? {
        guard let amount, amount > 0 else { return "Enter an amount greater than 0." }
        return nil
    }

    /// Positive puts money aside, negative takes it back out.
    func request(on date: Date) -> GoalEntryRequest {
        let value = amount ?? 0
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return GoalEntryRequest(
            amount: Money.string(direction == .take ? -value : value),
            entryDate: ISODate.string(date),
            note: note.isEmpty ? nil : note
        )
    }
}

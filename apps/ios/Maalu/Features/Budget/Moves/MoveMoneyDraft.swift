import Foundation

struct MoveMoneyDraft {
    /// The limit the money comes from; nil means a top-up that takes from no other limit.
    var sourceID: String?
    var amount: Decimal?
    var note = ""

    /// Why the draft cannot be sent, or nil when it can. `left` is what the chosen source has to give.
    func problem(left: Decimal?) -> LocalizedStringResource? {
        guard let amount, amount > 0 else { return "Enter an amount greater than 0." }
        if let left, amount > left { return "That is more than it has left." }
        return nil
    }

    func request(to lineID: String, on date: Date) -> MoveRequest {
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return MoveRequest(
            toLineId: lineID,
            fromLineId: sourceID,
            amount: amount.map(Money.string) ?? "0",
            on: ISODate.string(date),
            note: note.isEmpty ? nil : note
        )
    }
}

import Foundation

struct AdjustBalanceDraft {
    enum Mode: String, CaseIterable, Identifiable {
        case setBalance, change

        var id: String { rawValue }

        var title: LocalizedStringResource {
            switch self {
            case .setBalance: "Set to balance"
            case .change: "Add or take away"
            }
        }
    }

    var mode = Mode.setBalance
    var value: Decimal?
    var date = Date.now
    var note = ""

    var problem: LocalizedStringResource? {
        value == nil ? "Enter an amount." : nil
    }

    /// What the balance would be after, so the person sees the effect before saving.
    func preview(from balance: Decimal) -> Decimal? {
        guard let value else { return nil }
        return mode == .setBalance ? value : balance + value
    }

    func request() -> AdjustBalanceRequest {
        let note = note.trimmingCharacters(in: .whitespacesAndNewlines)
        return AdjustBalanceRequest(
            newBalance: mode == .setBalance ? value.map(Money.string) : nil,
            amount: mode == .change ? value.map(Money.string) : nil,
            date: ISODate.string(date),
            note: note.isEmpty ? nil : note
        )
    }
}

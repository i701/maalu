import Foundation
import Observation

@MainActor @Observable
final class CardFormModel {
    var name: String
    var lastDigits: String
    var repayAccountID: String?
    let kind: CardKind
    /// Where a credit card can be repaid from: everyday accounts, never a debt.
    let repayChoices: [Account]
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    private let accountID: String
    private let original: Card?

    init(account: Account, kind: CardKind, editing card: Card? = nil, accounts: [Account]) {
        self.kind = kind
        accountID = account.id
        original = card
        name = card?.name ?? ""
        lastDigits = card?.lastDigits ?? ""
        repayAccountID = card?.repayAccount?.id
        repayChoices = accounts.filter { !$0.group.isLiability && !$0.isArchived }
    }

    var isEditing: Bool { original != nil }

    /// The first thing wrong, or nil when it can be saved. The server checks it all again.
    var problem: LocalizedStringResource? {
        if name.trimmingCharacters(in: .whitespaces).isEmpty { return "Give the card a name." }
        let digits = lastDigits.trimmingCharacters(in: .whitespaces)
        if !digits.isEmpty && (digits.count != 4 || !digits.allSatisfy { $0.isASCII && $0.isNumber }) { return "The last four digits are four numbers." }
        return nil
    }

    var canSave: Bool { problem == nil && !isSaving }

    var request: CardRequest {
        let digits = lastDigits.trimmingCharacters(in: .whitespaces)
        return CardRequest(
            name: name.trimmingCharacters(in: .whitespaces),
            lastDigits: digits.isEmpty ? nil : digits,
            repayAccountId: kind == .credit ? repayAccountID : nil,
            kind: isEditing ? nil : kind.rawValue,
            accountId: isEditing ? nil : accountID
        )
    }

    func save(using api: Api) async -> Bool {
        isSaving = true
        errorMessage = nil
        let result: ApiResult<Card>
        if let original {
            result = await api.patchJSON("cards/\(original.id)", body: request)
        } else {
            result = await api.postJSON("cards", body: request)
        }
        isSaving = false
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

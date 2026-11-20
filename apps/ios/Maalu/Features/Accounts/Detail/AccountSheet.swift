import Foundation

enum AccountSheet: Identifiable {
    case edit(Account)
    case adjust(Account)
    case addCard(Account, CardKind)
    case editCard(Account, Card)
    case repay(Card, amount: Decimal?)
    case rateHistory(Account)

    var id: String {
        switch self {
        case .edit(let account): "edit-\(account.id)"
        case .adjust(let account): "adjust-\(account.id)"
        case .addCard(let account, _): "add-card-\(account.id)"
        case .editCard(_, let card): "edit-card-\(card.id)"
        case .repay(let card, _): "repay-\(card.id)"
        case .rateHistory(let account): "rate-history-\(account.id)"
        }
    }
}

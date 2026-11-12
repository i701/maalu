import Foundation

enum AccountGroup: String, Codable, CaseIterable, Identifiable {
    case cash, accounts, card, savings, prepaid, investments, overdrafts, loan, insurance, others

    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .cash: "Cash"
        case .accounts: "Bank accounts"
        case .card: "Credit cards"
        case .savings: "Savings"
        case .prepaid: "Prepaid"
        case .investments: "Investments"
        case .overdrafts: "Overdrafts"
        case .loan: "Loans"
        case .insurance: "Insurance"
        case .others: "Others"
        }
    }

    var help: LocalizedStringResource {
        switch self {
        case .cash: "Money you hold as notes and coins: a wallet, a drawer, a safe."
        case .accounts: "A bank account you keep money in and pay from. Its debit card is part of it: spend with the card and the money comes out of this account."
        case .card: "A credit card: you spend the bank's money and pay it back later, so the balance is what you owe. Set a credit limit to see how much is used."
        case .savings: "A bank savings account, or money you keep apart on purpose. Goals can follow its balance."
        case .prepaid: "A top-up balance you spend down: phone credit, a transport card, a gift card."
        case .investments: "Money invested in shares, funds or a business, whose value you track here."
        case .overdrafts: "An overdraft on a bank account: money you owe the bank, up to a limit."
        case .loan: "Money you owe and pay back in instalments, like a car or personal loan."
        case .insurance: "A policy with a cash value, or a premium balance you keep."
        case .others: "Anything that holds money and does not fit the rest."
        }
    }

    var hasCreditLimit: Bool { self == .card || self == .overdrafts }
    var isLiability: Bool { self == .card || self == .overdrafts || self == .loan }

    /// Whether an account of this group counts as everyday money when the person has not chosen.
    var isSpendableByDefault: Bool { self == .cash || self == .accounts || self == .prepaid }
}

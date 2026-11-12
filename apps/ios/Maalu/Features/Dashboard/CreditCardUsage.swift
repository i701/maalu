struct CreditCardUsage: Identifiable {
    let account: Account
    let usage: CreditUsage

    var id: String { account.id }

    static func cards(from accounts: [Account]) -> [CreditCardUsage] {
        accounts.compactMap { account in
            CreditUsage(balance: account.balance, limit: account.creditLimit).map { CreditCardUsage(account: account, usage: $0) }
        }
    }
}

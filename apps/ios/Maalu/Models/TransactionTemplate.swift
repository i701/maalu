import Foundation

struct TransactionTemplate: Decodable, Identifiable, Hashable {
    let id: String
    let name: String
    let type: TransactionType
    let amount: String?
    let currency: String
    let paymentMethod: PaymentMethod
    let category: String?
    let vendor: String?
    let description: String?
    let account: AccountRef?
    let toAccount: AccountRef?
    let tags: [NamedRef]
}

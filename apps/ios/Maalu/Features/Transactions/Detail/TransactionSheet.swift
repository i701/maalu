enum TransactionSheet: Identifiable {
    case edit(Transaction)
    case pay(Transaction)

    var id: String {
        switch self {
        case .edit(let transaction): "edit-\(transaction.id)"
        case .pay(let transaction): "pay-\(transaction.id)"
        }
    }
}

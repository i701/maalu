enum TransactionSheet: Identifiable {
    case edit(Transaction)
    case duplicate(Transaction)

    var id: String {
        switch self {
        case .edit(let transaction): "edit-\(transaction.id)"
        case .duplicate(let transaction): "duplicate-\(transaction.id)"
        }
    }
}

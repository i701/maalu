enum TransactionSheet: Identifiable {
    case edit(Transaction)

    var id: String {
        switch self {
        case .edit(let transaction): "edit-\(transaction.id)"
        }
    }
}

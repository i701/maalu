enum TransactionEditor: Identifiable {
    case create
    case edit(Transaction)

    var id: String {
        switch self {
        case .create: "create"
        case .edit(let transaction): transaction.id
        }
    }
}

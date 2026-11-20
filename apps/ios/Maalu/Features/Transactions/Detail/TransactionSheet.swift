enum TransactionSheet: Identifiable {
    case edit(Transaction)
    case duplicate(Transaction)
    case refund(Transaction)
    case editRefund(Transaction)
    case linkRefund(Transaction)

    var id: String {
        switch self {
        case .edit(let transaction): "edit-\(transaction.id)"
        case .duplicate(let transaction): "duplicate-\(transaction.id)"
        case .refund(let transaction): "refund-\(transaction.id)"
        case .editRefund(let transaction): "edit-refund-\(transaction.id)"
        case .linkRefund(let transaction): "link-refund-\(transaction.id)"
        }
    }
}

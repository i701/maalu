struct TransactionFilter: Hashable {
    var text = ""
    var type: TransactionType?

    var isActive: Bool { !text.isEmpty || type != nil }
}

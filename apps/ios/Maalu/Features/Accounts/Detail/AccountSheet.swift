enum AccountSheet: Identifiable {
    case edit(Account)
    case adjust(Account)

    var id: String {
        switch self {
        case .edit(let account): "edit-\(account.id)"
        case .adjust(let account): "adjust-\(account.id)"
        }
    }
}

struct AccountGroupSection: Identifiable {
    let group: AccountGroup
    let accounts: [Account]

    var id: AccountGroup { group }
}

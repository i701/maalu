struct AdjustBalanceRequest: Encodable {
    let newBalance: String?
    let amount: String?
    let date: String
    let note: String?
}

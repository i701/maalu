struct BalanceTrend: Decodable {
    let currency: String
    let points: [BalancePoint]
}

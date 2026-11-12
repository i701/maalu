struct MonthlyStats: Decodable {
    let currency: String
    let months: [MonthlyPoint]
}

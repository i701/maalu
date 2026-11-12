struct CategoryTotals: Decodable {
    let currency: String
    let categories: [CategoryTotal]
}

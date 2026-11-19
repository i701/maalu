struct PlaceTotals: Decodable {
    let currency: String
    /// Biggest spend first.
    let places: [PlaceTotal]
}

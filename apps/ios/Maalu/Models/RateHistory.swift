/// How the market rate of 1 `base` in `quote` moved, oldest first, from `/currencies/rate-history`.
struct RateHistory: Decodable {
    let points: [RatePoint]
    let source: String
}

struct RatePoint: Decodable, Identifiable {
    let date: String
    let rate: String

    var id: String { date }
}

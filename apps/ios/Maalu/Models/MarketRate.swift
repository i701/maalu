import Foundation

/// The market rate for 1 `base` in `quote` on a day, from `/currencies/rate`: a suggestion to fill in.
struct MarketRate: Decodable {
    let rate: String
    let rateDate: String
    let exact: Bool
    let source: String
}

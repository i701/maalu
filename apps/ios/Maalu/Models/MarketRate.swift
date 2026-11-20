import Foundation

/// The market rate for 1 `base` in `quote` on a day, from `/currencies/rate`: a suggestion to fill in.
struct MarketRate: Decodable {
    let rate: String
    let rateDate: String
    let exact: Bool
    let source: String
}

extension MarketRate {
    /// Says where a suggested rate came from, for under a rate field.
    var note: LocalizedStringResource {
        let day = ISODate.date(rateDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? rateDate
        let nearest = exact ? "" : " (nearest day)"
        return "Market rate for \(day)\(nearest), from \(source). Change it if your bank used another."
    }
}

extension Api {
    /// The market rate of 1 `base` in `quote` on a day: only ever a suggestion.
    func marketRate(from base: String, to quote: String, on day: Date) async -> ApiResult<MarketRate> {
        await get("currencies/rate", query: [
            URLQueryItem(name: "base", value: base),
            URLQueryItem(name: "quote", value: quote),
            URLQueryItem(name: "on", value: ISODate.string(day)),
        ])
    }
}

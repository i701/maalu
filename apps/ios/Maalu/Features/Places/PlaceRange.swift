import Foundation

/// The spans the Places page offers, as on the web.
enum PlaceRange: String, CaseIterable, Identifiable {
    case month, threeMonths, year, all

    var id: Self { self }

    var title: LocalizedStringResource {
        switch self {
        case .month: "This month"
        case .threeMonths: "3 months"
        case .year: "This year"
        case .all: "All time"
        }
    }

    /// The first and last day it covers on `today`, as ISO dates; none for all time.
    func bounds(on today: String) -> (from: String, to: String)? {
        guard let thisMonth = ComparePreset.periods(for: .thisMonth, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil)?.now else { return nil }
        let year = today.prefix(4)
        switch self {
        case .month: return (thisMonth.from, thisMonth.to)
        case .threeMonths: return (ComparePreset.shiftMonth(thisMonth.from, by: -2), thisMonth.to)
        case .year: return ("\(year)-01-01", "\(year)-12-31")
        case .all: return nil
        }
    }
}

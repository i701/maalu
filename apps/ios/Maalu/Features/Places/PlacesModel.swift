import Foundation
import Observation

@MainActor @Observable
final class PlacesModel {
    var range = PlaceRange.threeMonths
    var selectedID: String?
    private(set) var totals: PlaceTotals?
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    var places: [PlaceTotal] { totals?.places ?? [] }
    var currency: String { totals?.currency ?? "" }
    var selected: PlaceTotal? { places.first { $0.id == selectedID } }

    /// A spot's circle on screen, in points: by area, so twice the spend looks twice as big, from 14 to 48.
    nonisolated static func diameter(of spent: Decimal, largest: Decimal) -> Double {
        guard largest > 0, spent > 0 else { return 14 }
        let share = min(NSDecimalNumber(decimal: spent / largest).doubleValue, 1)
        return 14 + 34 * share.squareRoot()
    }

    func diameter(of place: PlaceTotal) -> Double {
        Self.diameter(of: place.spentValue, largest: places.first?.spentValue ?? 0)
    }

    func load(using api: Api) async {
        var query: [URLQueryItem] = []
        if let bounds = range.bounds(on: ISODate.string(.now)) {
            query = [URLQueryItem(name: "date_from", value: bounds.from), URLQueryItem(name: "date_to", value: bounds.to)]
        }
        isLoading = true
        let result: ApiResult<PlaceTotals> = await api.get("transactions/places", query: query)
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            totals = value
            if selected == nil { selectedID = nil }
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

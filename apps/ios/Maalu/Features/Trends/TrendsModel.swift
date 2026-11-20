import Foundation
import Observation

@MainActor @Observable
final class TrendsModel {
    var kind = TrendsKind.spending
    var months = 12
    var layout = TrendsLayout.table
    private(set) var data: CategoryMonths?
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    /// The rows of the chosen kind, biggest first.
    var rows: [CategoryMonthRow] {
        (data?.categories ?? []).filter { $0.type == kind.type }.sorted { $0.totalValue > $1.totalValue }
    }

    func load(using api: Api) async {
        isLoading = true
        let range = TrendsMath.bounds(months: months, today: ISODate.string(.now))
        let result: ApiResult<CategoryMonths> = await api.get("transactions/categories/monthly", query: [
            URLQueryItem(name: "date_from", value: range.from),
            URLQueryItem(name: "date_to", value: range.to),
        ])
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            data = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

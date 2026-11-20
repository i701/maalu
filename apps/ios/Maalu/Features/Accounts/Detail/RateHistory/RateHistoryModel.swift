import Foundation
import Observation

@MainActor @Observable
final class RateHistoryModel {
    var range = AccountHistoryRange.quarter
    private(set) var history: RateHistory?
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    var summary: RateSummary? { history.flatMap { RateSummary($0.points) } }

    func load(from base: String, to quote: String, using api: Api) async {
        isLoading = true
        let result: ApiResult<RateHistory> = await api.get("currencies/rate-history", query: [
            URLQueryItem(name: "base", value: base),
            URLQueryItem(name: "quote", value: quote),
            URLQueryItem(name: "days", value: String(range.rawValue)),
        ])
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            history = value
            errorMessage = nil
        case .failed(_, let message):
            history = nil
            errorMessage = message
        }
    }
}

import Foundation
import Observation

@MainActor @Observable
final class DashboardModel {
    private(set) var available: AvailableToSpend?
    private(set) var summary: AccountSummary?
    private(set) var trend: [BalancePoint] = []
    private(set) var months: [MonthlyPoint] = []
    private(set) var currency = ""
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    static let trendDays = 30
    static let monthsLoaded = 12

    var hasContent: Bool { available != nil || summary != nil || !months.isEmpty }

    func load(using api: Api, now: Date = .now) async {
        let from = Calendar.current.date(byAdding: .day, value: 1 - Self.trendDays, to: now) ?? now
        async let availableResult: ApiResult<AvailableToSpend> = api.get("stats/available-to-spend")
        async let summaryResult: ApiResult<AccountSummary> = api.get("accounts/summary")
        async let trendResult: ApiResult<BalanceTrend> = api.get("stats/balance-trend", query: [
            URLQueryItem(name: "from", value: ISODate.string(from)),
            URLQueryItem(name: "to", value: ISODate.string(now)),
        ])
        async let monthsResult: ApiResult<MonthlyStats> = api.get("stats/monthly", query: [
            URLQueryItem(name: "months", value: String(Self.monthsLoaded)),
        ])
        let (available, summary, trend, months) = await (availableResult, summaryResult, trendResult, monthsResult)
        guard !Task.isCancelled else { return }
        isLoading = false

        if case .ok(let value, _) = available { self.available = value }
        if case .ok(let value, _) = summary { self.summary = value; currency = value.currency }
        if case .ok(let value, _) = trend { self.trend = value.points }
        if case .ok(let value, _) = months { self.months = value.months }
        errorMessage = hasContent ? nil : [failure(available), failure(summary)].compactMap { $0 }.first
    }

    private func failure<T>(_ result: ApiResult<T>) -> String? {
        if case .failed(_, let message) = result { message } else { nil }
    }
}

import Foundation
import Observation

@MainActor @Observable
final class CompareModel {
    var preset: ComparePreset = .lastMonth {
        didSet { seedCustomIfNeeded() }
    }
    var nowFrom: String?
    var nowTo: String?
    var beforeFrom: String?
    var beforeTo: String?

    private(set) var periods: ComparePeriods?
    private(set) var now: CategoryTotals?
    private(set) var before: CategoryTotals?
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    private(set) var today = ISODate.string(.now)

    /// Changes whenever the comparison does, so the view refetches on it.
    var queryKey: String {
        "\(preset.rawValue)|\(nowFrom ?? "-")|\(nowTo ?? "-")|\(beforeFrom ?? "-")|\(beforeTo ?? "-")"
    }

    var currency: String { now?.currency ?? "" }

    var totals: CompareTotals? {
        guard let before, let now else { return nil }
        return CompareTotals.make(before: before.categories, now: now.categories)
    }

    var spendingRows: [CompareRow]? {
        guard let before, let now else { return nil }
        return CompareRow.rows(before: before.categories, now: now.categories, type: .expense)
    }

    var incomeRows: [CompareRow]? {
        guard let before, let now else { return nil }
        return CompareRow.rows(before: before.categories, now: now.categories, type: .income)
    }

    var kindRows: [CompareRow]? {
        guard let before, let now else { return nil }
        return CompareKinds.rows(before: before.categories, now: now.categories)
    }

    /// The chart's bars: the biggest categories by money in the two periods put together.
    var chartRows: [CompareRow] {
        guard let spendingRows else { return [] }
        return Array(spendingRows
            .sorted { $0.change.now + $0.change.before > $1.change.now + $1.change.before }
            .prefix(8))
    }

    var sentence: String? {
        guard let totals, let spendingRows, let periods else { return nil }
        return CompareText.spendingSentence(expense: totals.expense, rows: spendingRows, against: periods.before.label, currency: currency)
    }

    var isCustomIncomplete: Bool {
        preset == .custom && (nowFrom == nil || nowTo == nil || beforeFrom == nil || beforeTo == nil)
    }

    var hasContent: Bool { periods != nil && totals != nil }

    /// The date pickers: the chosen day, or today while none is chosen.
    var pickerNowFrom: Date {
        get { nowFrom.flatMap(ISODate.date) ?? .now }
        set { nowFrom = ISODate.string(newValue) }
    }

    var pickerNowTo: Date {
        get { nowTo.flatMap(ISODate.date) ?? .now }
        set { nowTo = ISODate.string(newValue) }
    }

    var pickerBeforeFrom: Date {
        get { beforeFrom.flatMap(ISODate.date) ?? .now }
        set { beforeFrom = ISODate.string(newValue) }
    }

    var pickerBeforeTo: Date {
        get { beforeTo.flatMap(ISODate.date) ?? .now }
        set { beforeTo = ISODate.string(newValue) }
    }

    func clearCustom() {
        nowFrom = nil
        nowTo = nil
        beforeFrom = nil
        beforeTo = nil
    }

    /// Switching to Custom starts from what is on screen (or the last 30 days), so the ranges are
    /// filled in and only need adjusting.
    private func seedCustomIfNeeded() {
        guard preset == .custom, !customComplete else { return }
        let seed = periods ?? ComparePreset.periods(for: .last30, on: today, nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil)
        guard let seed else { return }
        nowFrom = seed.now.from
        nowTo = seed.now.to
        beforeFrom = seed.before.from
        beforeTo = seed.before.to
    }

    private var customComplete: Bool {
        nowFrom != nil && nowTo != nil && beforeFrom != nil && beforeTo != nil
    }

    func load(using api: Api) async {
        today = ISODate.string(.now)
        periods = ComparePreset.periods(for: preset, on: today, nowFrom: nowFrom, nowTo: nowTo, beforeFrom: beforeFrom, beforeTo: beforeTo)
        guard let periods else {
            now = nil
            before = nil
            isLoading = false
            errorMessage = nil
            return
        }
        isLoading = true
        async let beforeResult: ApiResult<CategoryTotals> = api.get("transactions/categories", query: [
            URLQueryItem(name: "date_from", value: periods.before.from),
            URLQueryItem(name: "date_to", value: periods.before.to),
        ])
        async let nowResult: ApiResult<CategoryTotals> = api.get("transactions/categories", query: [
            URLQueryItem(name: "date_from", value: periods.now.from),
            URLQueryItem(name: "date_to", value: periods.now.to),
        ])
        let (before, now) = await (beforeResult, nowResult)
        guard !Task.isCancelled else { return }
        isLoading = false
        switch (before, now) {
        case (.ok(let beforeValue, _), .ok(let nowValue, _)):
            self.before = beforeValue
            self.now = nowValue
            errorMessage = nil
        default:
            errorMessage = failure(before) ?? failure(now)
        }
    }

    private func failure<T>(_ result: ApiResult<T>) -> String? {
        if case .failed(_, let message) = result { message } else { nil }
    }
}

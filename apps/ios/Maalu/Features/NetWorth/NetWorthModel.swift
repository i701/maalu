import Foundation
import Observation

@MainActor @Observable
final class NetWorthModel {
    /// A rolling month is always a full month of days, unlike "this month" early on.
    var preset: ComparePreset = .last30 {
        didSet { seedCustomIfNeeded() }
    }
    var customFrom: String?
    var customTo: String?

    private(set) var data: NetWorthDrivers?
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    /// Changes whenever the period does, so the view refetches on it.
    var queryKey: String { "\(preset.rawValue)|\(customFrom ?? "-")|\(customTo ?? "-")" }

    /// The period on `today`: only the first of a preset's two ranges is used here.
    func range(on today: String = ISODate.string(.now)) -> CompareRange? {
        ComparePreset.periods(for: preset, on: today, nowFrom: customFrom, nowTo: customTo, beforeFrom: customFrom, beforeTo: customTo)?.now
    }

    var bars: [NetWorthBar] {
        guard let data else { return [] }
        return NetWorthBar.bars(drivers: data.drivers, change: data.changeValue)
    }

    var movedDrivers: [NetWorthDriver] { data?.drivers.filter { $0.value != 0 } ?? [] }

    var pickerFrom: Date {
        get { customFrom.flatMap(ISODate.date) ?? .now }
        set { customFrom = ISODate.string(newValue) }
    }

    var pickerTo: Date {
        get { customTo.flatMap(ISODate.date) ?? .now }
        set { customTo = ISODate.string(newValue) }
    }

    /// Switching to Custom starts from the period on screen, so the dates only need adjusting.
    private func seedCustomIfNeeded() {
        guard preset == .custom, customFrom == nil || customTo == nil else { return }
        let seed = data.map { CompareRange(from: $0.startDate, to: $0.endDate, label: "") }
            ?? ComparePreset.periods(for: .last30, on: ISODate.string(.now), nowFrom: nil, nowTo: nil, beforeFrom: nil, beforeTo: nil)?.now
        customFrom = seed?.from
        customTo = seed?.to
    }

    func load(using api: Api) async {
        guard let range = range() else {
            data = nil
            isLoading = false
            errorMessage = String(localized: "Pick a start and an end, in order.")
            return
        }
        isLoading = true
        let result: ApiResult<NetWorthDrivers> = await api.get("stats/net-worth-drivers", query: [
            URLQueryItem(name: "from", value: range.from),
            URLQueryItem(name: "to", value: range.to),
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

import Foundation
import Observation

@MainActor @Observable
final class PendingModel {
    private(set) var tasks: [SalarySplitTask] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    /// The task being approved or dismissed.
    private(set) var busyID: String?

    func load(using api: Api) async {
        let result: ApiResult<[SalarySplitTask]> = await api.get("salary-split-tasks")
        guard !Task.isCancelled else { return }
        isLoading = false
        switch result {
        case .ok(let value, _):
            tasks = value
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// Makes every line that can be made, as proposed. Returns a message to show.
    func approve(_ task: SalarySplitTask, using api: Api) async -> String {
        busyID = task.id
        defer { busyID = nil }
        let lines = SalarySplitLine.lines(of: task.plan)
        let result: ApiResult<SalarySplitResult> = await api.postJSON("transactions/\(task.plan.salaryId)/salary-split", body: SalarySplitRequest(lines: lines))
        switch result {
        case .ok(let value, _):
            await load(using: api)
            return value.message
        case .failed(_, let message):
            return message
        }
    }

    /// The salary can still be split by hand later. Returns a message to show.
    func dismiss(_ task: SalarySplitTask, using api: Api) async -> String {
        busyID = task.id
        defer { busyID = nil }
        let result = await api.post("salary-split-tasks/\(task.id)/dismiss")
        if case .failed(_, let message) = result { return message }
        await load(using: api)
        return String(localized: "Dismissed. You can still split it from the salary.")
    }
}

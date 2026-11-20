import Foundation
import Observation

@MainActor @Observable
final class SalarySplitModel {
    let transactionID: String
    private(set) var plan: SalarySplitPlan?
    var lines: [SalarySplitLine] = []
    private(set) var isSaving = false
    private(set) var errorMessage: String?

    init(transactionID: String) {
        self.transactionID = transactionID
    }

    var totals: SalarySplitTotals? {
        plan.map { SalarySplitTotals(lines: lines, salary: Money.decimal($0.amount) ?? 0, made: $0.madeTotal) }
    }

    /// The reason the lines cannot be made yet, or nil when they can.
    var problem: LocalizedStringResource? {
        guard let totals else { return nil }
        if totals.count == 0 { return "Tick at least one line." }
        if totals.isInvalid { return "Every ticked line needs an amount above zero, with at most four decimals." }
        if totals.isOver { return "These add up to more than the salary." }
        return nil
    }

    func load(using api: Api) async {
        let result: ApiResult<SalarySplitPlan> = await api.get("transactions/\(transactionID)/salary-split")
        guard !Task.isCancelled else { return }
        switch result {
        case .ok(let value, _):
            plan = value
            lines = SalarySplitLine.lines(of: value)
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }

    /// The message to show when it was made; nil with `errorMessage` set when it was refused.
    func apply(using api: Api) async -> String? {
        isSaving = true
        defer { isSaving = false }
        let result: ApiResult<SalarySplitResult> = await api.postJSON("transactions/\(transactionID)/salary-split", body: SalarySplitRequest(lines: lines))
        switch result {
        case .ok(let value, _):
            errorMessage = nil
            return value.message
        case .failed(_, let message):
            errorMessage = message
            return nil
        }
    }

    /// True when the transfers went to the trash and the set-asides were removed.
    func undo(using api: Api) async -> Bool {
        isSaving = true
        defer { isSaving = false }
        let result = await api.delete("transactions/\(transactionID)/salary-split")
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        errorMessage = nil
        return true
    }
}

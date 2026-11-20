import Foundation
import Observation

@MainActor @Observable
final class LinkRefundModel {
    let income: Transaction
    private(set) var candidates: [Transaction]?
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    var query = ""
    var items: [RefundItem] = []
    private(set) var chosen: Transaction?

    init(income: Transaction) {
        self.income = income
    }

    /// The items must add up to the money that came back, and a purchase with items needs some ticked.
    var itemsAddUp: Bool { items.isEmpty || RefundItem.total(items) == Money.decimal(income.amount) }
    var canLink: Bool { chosen != nil && itemsAddUp && (items.isEmpty || items.contains(where: \.isOn)) && !isSaving }

    func choose(_ purchase: Transaction) {
        chosen = purchase
        items = RefundItem.toPick(from: purchase)
        errorMessage = nil
    }

    /// The purchases the server found: same currency, on or before the income, with enough left, the likeliest first.
    func search(using api: Api) async {
        if !query.isEmpty { try? await Task.sleep(for: .milliseconds(300)) }
        guard !Task.isCancelled else { return }
        let result: ApiResult<[Transaction]> = await api.get(
            "transactions/\(income.id)/refund-candidates",
            query: query.isEmpty ? [] : [URLQueryItem(name: "q", value: query)]
        )
        guard !Task.isCancelled else { return }
        switch result {
        case .ok(let found, _):
            candidates = found
            errorMessage = nil
        case .failed(_, let message):
            candidates = []
            errorMessage = message
        }
    }

    /// True when it was linked; otherwise `errorMessage` says why.
    func link(using api: Api) async -> Bool {
        guard let chosen else { return false }
        isSaving = true
        defer { isSaving = false }
        let result: ApiResult<Transaction> = await api.patchJSON(
            "transactions/\(income.id)",
            body: LinkRefundRequest(purchaseID: chosen.id, lines: items.isEmpty ? nil : RefundLine.lines(items))
        )
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        return true
    }
}

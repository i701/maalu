import Foundation
import Observation

@MainActor @Observable
final class MakeSubscriptionModel {
    var draft: MakeSubscriptionDraft
    private(set) var isSaving = false
    private(set) var errorMessage: String?
    let transaction: Transaction

    init(transaction: Transaction) {
        self.transaction = transaction
        draft = MakeSubscriptionDraft(transaction: transaction)
    }

    var canSave: Bool { draft.problem == nil && !isSaving }

    /// The amount, currency, rate, vendor and category are copied by the server.
    var summary: String {
        let amount = MoneyFormat.string(transaction.amount, currency: transaction.currency)
        let day = ISODate.date(transaction.transactionDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? transaction.transactionDate
        return String(localized: "\(amount) on \(day) becomes the first payment. Amount, currency, rate, vendor and category are copied.")
    }

    /// True when it was made; otherwise `errorMessage` says why.
    func save(using api: Api) async -> Bool {
        isSaving = true
        defer { isSaving = false }
        let result: ApiResult<Subscription> = await api.postJSON("subscriptions/from-transaction/\(transaction.id)", body: draft.request)
        if case .failed(_, let message) = result {
            errorMessage = message
            return false
        }
        errorMessage = nil
        return true
    }
}

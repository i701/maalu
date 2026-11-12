import Foundation
import Observation

/// Fetches the planned transaction (the plan only carries a summary of it) and the base currency.
@MainActor @Observable
final class MarkPaidLoader {
    private(set) var form: MarkPaidFormModel?
    private(set) var errorMessage: String?
    private let transactionID: String

    init(transactionID: String) {
        self.transactionID = transactionID
    }

    func load(using api: Api) async {
        async let transaction: ApiResult<Transaction> = api.get("transactions/\(transactionID)")
        async let profile: ApiResult<Profile> = api.get("users/me")
        let (transactionResult, profileResult) = await (transaction, profile)
        guard case .ok(let planned, _) = transactionResult, case .ok(let me, _) = profileResult else {
            if case .failed(_, let message) = transactionResult { errorMessage = message }
            else if case .failed(_, let message) = profileResult { errorMessage = message }
            return
        }
        form = MarkPaidFormModel(planned: planned, baseCurrency: me.baseCurrency)
    }
}

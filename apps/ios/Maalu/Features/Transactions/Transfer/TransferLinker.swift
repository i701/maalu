import Foundation

/// The two calls on a pair: merging it into one transfer, and saying it is not one.
@MainActor
enum TransferLinker {
    /// Returns a message when the server refused, nil when it was made: the expense is now the transfer and the income is in the trash.
    static func link(expense: Transaction, income: Transaction, using api: Api) async -> String? {
        let result: ApiResult<Transaction> = await api.postJSON("transactions/link-transfer", body: TransferPairRequest(expenseID: expense.id, incomeID: income.id))
        if case .failed(_, let message) = result { return message }
        return nil
    }

    /// Returns a message when the server refused, nil when the pair will not be suggested again.
    static func dismiss(expense: Transaction, income: Transaction, using api: Api) async -> String? {
        let result = await api.postJSONNoContent("transactions/transfer-suggestions/dismiss", body: TransferPairRequest(expenseID: expense.id, incomeID: income.id))
        if case .failed(_, let message) = result { return message }
        return nil
    }
}

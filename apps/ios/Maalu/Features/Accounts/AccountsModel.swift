import Observation

@MainActor @Observable
final class AccountsModel {
    private(set) var accounts: [Account] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?

    func load(using api: Api) async {
        let result: ApiResult<[Account]> = await api.get("accounts")
        isLoading = false
        switch result {
        case .ok(let accounts, _):
            self.accounts = accounts
            errorMessage = nil
        case .failed(_, let message):
            errorMessage = message
        }
    }
}

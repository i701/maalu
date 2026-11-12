import Foundation
import Observation

@MainActor @Observable
final class AccountsModel {
    private(set) var accounts: [Account] = []
    private(set) var isLoading = true
    private(set) var errorMessage: String?
    var showsArchived = false

    var groups: [AccountGroupSection] {
        AccountGroup.allCases.compactMap { group in
            let members = accounts.filter { $0.group == group }
            return members.isEmpty ? nil : AccountGroupSection(group: group, accounts: members)
        }
    }

    func account(id: String) -> Account? {
        accounts.first { $0.id == id }
    }

    func load(using api: Api) async {
        let result: ApiResult<[Account]> = await api.get("accounts", query: showsArchived ? [URLQueryItem(name: "archived", value: "true")] : [])
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

import Foundation

struct AccountGroupSection: Identifiable {
    let title: String
    let accounts: [Account]

    var id: String { title }

    static func sections(of accounts: [Account], by grouping: AccountGrouping) -> [AccountGroupSection] {
        let sections = switch grouping {
        case .type:
            AccountGroup.allCases.map { group in
                AccountGroupSection(title: String(localized: group.title), accounts: accounts.filter { $0.group == group })
            }
        case .bank:
            banks(in: accounts).map { bank in
                AccountGroupSection(title: bank, accounts: accounts.filter { $0.bank == bank })
            } + [AccountGroupSection(title: String(localized: "No bank"), accounts: accounts.filter { $0.bank == nil })]
        }
        return sections.filter { !$0.accounts.isEmpty }
    }

    static func banks(in accounts: [Account]) -> [String] {
        Set(accounts.compactMap(\.bank)).sorted { $0.localizedStandardCompare($1) == .orderedAscending }
    }
}

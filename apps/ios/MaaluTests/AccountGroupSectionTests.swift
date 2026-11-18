import Foundation
import Testing
@testable import Maalu

struct AccountGroupSectionTests {
    private func account(_ id: String, group: String, bank: String?) throws -> Account {
        let bankJSON = bank.map { "\"\($0)\"" } ?? "null"
        return try Api.decoder.decode(Account.self, from: Data(#"""
        {"id":"\#(id)","name":"\#(id)","group":"\#(group)","currency":"MVR","balance":"0","base_balance":"0","opening_amount":"0",
         "exchange_rate":"1","auto_rate":false,"bank":\#(bankJSON),"account_number":null,"description":null,
         "credit_limit":null,"statement_day":null,"due_day":null,"exclude_from_stats":false,"spendable":null,"archived_at":null,"transaction_count":0}
        """#.utf8))
    }

    @Test func byBankListsBanksInOrderThenTheAccountsWithNone() throws {
        let accounts = [
            try account("wallet", group: "cash", bank: nil),
            try account("card", group: "card", bank: "SBI"),
            try account("current", group: "accounts", bank: "BML"),
        ]
        let sections = AccountGroupSection.sections(of: accounts, by: .bank)
        #expect(sections.map(\.title) == ["BML", "SBI", "No bank"])
        #expect(sections.map { $0.accounts.map(\.id) } == [["current"], ["card"], ["wallet"]])
    }

    @Test func byTypeLeavesOutEmptyGroups() throws {
        let sections = AccountGroupSection.sections(of: [try account("card", group: "card", bank: "SBI")], by: .type)
        #expect(sections.map(\.title) == ["Credit cards"])
    }
}

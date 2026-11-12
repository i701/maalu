import Foundation
import Testing
@testable import Maalu

struct TransactionDraftTests {
    private func accounts() throws -> [Account] {
        func json(_ id: String, _ name: String, _ group: String, _ currency: String, _ rate: String) -> String {
            #"""
            {"id":"\#(id)","name":"\#(name)","group":"\#(group)","currency":"\#(currency)","balance":"0","base_balance":"0",
             "opening_amount":"0","exchange_rate":"\#(rate)","auto_rate":false,"bank":null,"account_number":null,"description":null,
             "credit_limit":null,"statement_day":null,"due_day":null,"exclude_from_stats":false,"spendable":null,
             "archived_at":null,"transaction_count":0}
            """#
        }
        let list = [json("mvr", "BML", "accounts", "MVR", "1"), json("usd", "Dollar", "accounts", "USD", "15.42"), json("mvr2", "Savings", "savings", "MVR", "1")]
        return try Api.decoder.decode([Account].self, from: Data("[\(list.joined(separator: ","))]".utf8))
    }

    private func draft(_ configure: (inout TransactionDraft) -> Void) -> TransactionDraft {
        var draft = TransactionDraft()
        draft.amount = 12
        draft.accountID = "mvr"
        draft.category = "Food"
        configure(&draft)
        return draft
    }

    private func json(_ request: TransactionRequest) throws -> [String: Any] {
        let encoder = JSONEncoder()
        let data = try encoder.encode(request)
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    @Test func aCompleteExpenseHasNoProblem() throws {
        #expect(draft { _ in }.problem(accounts: try accounts(), baseCurrency: "MVR") == nil)
    }

    @Test func amountAndCategoryAreRequired() throws {
        let accounts = try accounts()
        #expect(draft { $0.amount = nil }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.amount = 0 }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.category = "  " }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
    }

    @Test func aForeignAccountNeedsARate() throws {
        let accounts = try accounts()
        #expect(draft { $0.accountID = "usd" }.problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(draft { $0.accountID = "usd"; $0.rate = 15.42 }.problem(accounts: accounts, baseCurrency: "MVR") == nil)
    }

    @Test func aTransferNeedsTwoDifferentAccountsAndAnArrivingAmountAcrossCurrencies() throws {
        let accounts = try accounts()
        func transfer(to: String?, toAmount: Decimal? = nil) -> TransactionDraft {
            draft { $0.type = .transfer; $0.toAccountID = to; $0.toAmount = toAmount }
        }
        #expect(transfer(to: nil).problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(transfer(to: "mvr").problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(transfer(to: "mvr2").problem(accounts: accounts, baseCurrency: "MVR") == nil)
        #expect(transfer(to: "usd").problem(accounts: accounts, baseCurrency: "MVR") != nil)
        #expect(transfer(to: "usd", toAmount: 0.8).problem(accounts: accounts, baseCurrency: "MVR") == nil)
    }

    @Test func requestUsesTheApisSpellings() throws {
        let body = try json(draft { $0.vendor = "Ooredoo"; $0.note = "Top up"; $0.method = .bankTransfer }
            .request(accounts: try accounts(), baseCurrency: "MVR", editing: nil))
        #expect(body["type"] as? String == "expense")
        #expect(body["amount"] as? String == "12")
        #expect(body["account_id"] as? String == "mvr")
        #expect(body["vendor_name"] as? String == "Ooredoo")
        #expect(body["payment_method"] as? String == "bank_transfer")
        #expect(body["description"] as? String == "Top up")
        #expect(body["exchange_rate"] == nil)
        #expect(body["planned"] == nil)
    }

    @Test func aForeignAccountSendsItsCurrencyAndRate() throws {
        let body = try json(draft { $0.accountID = "usd"; $0.rate = 15.42 }
            .request(accounts: try accounts(), baseCurrency: "MVR", editing: nil))
        #expect(body["currency"] as? String == "USD")
        #expect(body["exchange_rate"] as? String == "15.42")
    }

    @Test func aFutureDateIsPlanned() throws {
        let tomorrow = try #require(Calendar.current.date(byAdding: .day, value: 1, to: .now))
        let body = try json(draft { $0.date = tomorrow }.request(accounts: try accounts(), baseCurrency: "MVR", editing: nil))
        #expect(body["planned"] as? Bool == true)
    }

    @Test func clearingAVendorOrNoteOnAnEditSendsNull() throws {
        let original = try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"1","type":"expense","amount":"12","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"12",
         "category":"Food","description":"Lunch","transaction_date":"2026-11-12","transaction_time":null,"planned":false,
         "payment_method":"cash","account":{"id":"mvr","name":"BML","currency":"MVR"},"to_account":null,
         "vendor":{"id":"v","name":"Cafe"},"card":null,"subscription":null,"tags":[],"refund_of":null,
         "refunded_amount":"0","splits":[],"adjustment":false}
        """#.utf8))
        var edited = TransactionDraft(editing: original)
        edited.vendor = ""
        edited.note = ""
        let body = try json(edited.request(accounts: try accounts(), baseCurrency: "MVR", editing: original))
        #expect(body["vendor_id"] is NSNull)
        #expect(body["description"] is NSNull)
        #expect(body["vendor_name"] == nil)
    }
}

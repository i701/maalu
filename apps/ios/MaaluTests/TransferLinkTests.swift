import Foundation
import Testing
@testable import Maalu

@MainActor
struct TransferLinkTests {
    private func entry(type: String, account: String = "a", planned: Bool = false, refunded: String = "0", splits: String = "[]", refundOf: String = "null", adjustment: Bool = false) throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(#"""
        {"id":"\#(type)-\#(account)","type":"\#(type)","amount":"100","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"100","category":"Food",
         "description":null,"transaction_date":"2026-11-15","transaction_time":null,"planned":\#(planned),"payment_method":"other",
         "account":{"id":"\#(account)","name":"Acc \#(account)","currency":"MVR"},"to_account":null,"vendor":null,"card":null,"subscription":null,"tags":[],
         "refund_of":\#(refundOf),"refunded_amount":"\#(refunded)","splits":\#(splits),"adjustment":\#(adjustment)}
        """#.utf8))
    }

    @Test func anExpenseSideIsMoneyOutThatWouldLoseNothing() throws {
        #expect(try TransferLinkRules.canBeExpenseSide(entry(type: "expense")))
        #expect(try !TransferLinkRules.canBeExpenseSide(entry(type: "expense", planned: true)))
        #expect(try !TransferLinkRules.canBeExpenseSide(entry(type: "expense", refunded: "10")))
        #expect(try !TransferLinkRules.canBeExpenseSide(entry(type: "expense", splits: #"[{"id":"s","name":"x","quantity":"1","category":"Food","amount":"100","tax_amount":null,"refunded_amount":"0","refund_of_split_id":null}]"#)))
        #expect(try !TransferLinkRules.canBeExpenseSide(entry(type: "income")))
    }

    @Test func anIncomeSideIsMoneyInThatIsNotARefundOrACorrection() throws {
        #expect(try TransferLinkRules.canBeIncomeSide(entry(type: "income")))
        #expect(try !TransferLinkRules.canBeIncomeSide(entry(type: "income", adjustment: true)))
        #expect(try !TransferLinkRules.canBeIncomeSide(entry(type: "income", refundOf: #"{"id":"p","amount":"50","currency":"MVR","category":"Food","transaction_date":"2026-11-01","vendor_name":null}"#)))
        #expect(try !TransferLinkRules.canLink(entry(type: "transfer")))
    }

    @Test func twoEntriesPairInAnyOrderOnlyAcrossAccounts() throws {
        let out = try entry(type: "expense", account: "a")
        let into = try entry(type: "income", account: "b")
        #expect(TransferLinkRules.pair(out, into)?.expense.id == out.id)
        #expect(TransferLinkRules.pair(into, out)?.income.id == into.id)
        #expect(TransferLinkRules.pair(out, try entry(type: "income", account: "a")) == nil)
        #expect(TransferLinkRules.pair(out, try entry(type: "expense", account: "b")) == nil)
    }

    @Test func theWordsFollowTheCount() {
        #expect(TransferLinkRules.mergeLabel(1) == "Merge with 1 matching entry")
        #expect(TransferLinkRules.mergeLabel(3) == "Merge with 3 matching entries")
        #expect(TransferLinkRules.daysApartText(0) == "same day")
        #expect(TransferLinkRules.daysApartText(1) == "1 day apart")
        #expect(TransferLinkRules.daysApartText(2) == "2 days apart")
    }

    @Test func theConfirmationSaysWhereTheMoneyGoes() throws {
        let sentence = TransferLinkRules.sentence(expense: try entry(type: "expense", account: "a"), income: try entry(type: "income", account: "b"))
        #expect(sentence.contains("from Acc a to Acc b"))
        #expect(!sentence.contains("arriving as"))
    }

    @Test func aSuggestionAndThePairRequestMatchTheAPI() throws {
        let tx = try String(decoding: JSONEncoder().encode(TransferPairRequest(expenseID: "e", incomeID: "i")), as: UTF8.self)
        #expect(tx.contains(#""expense_id":"e""#) && tx.contains(#""income_id":"i""#))
    }
}

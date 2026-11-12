import Foundation
import Testing
@testable import Maalu

struct TransactionTests {
    private func decode(_ json: String) throws -> Transaction {
        try Api.decoder.decode(Transaction.self, from: Data(json.utf8))
    }

    private func transaction(type: String, amount: String = "12.50", date: String = "2026-11-12", vendor: String = "null", description: String? = nil) throws -> Transaction {
        let text = description.map { "\"\($0)\"" } ?? "null"
        return try decode(#"""
        {"id":"1","type":"\#(type)","amount":"\#(amount)","to_amount":null,"currency":"MVR","exchange_rate":"1",
         "base_amount":"\#(amount)","category":"Food","description":\#(text),"transaction_date":"\#(date)",
         "transaction_time":null,"planned":false,"payment_method":"cash",
         "account":{"id":"a","name":"BML","currency":"MVR"},"to_account":null,"vendor":\#(vendor),"card":null,
         "subscription":null,"tags":[],"refund_of":null,"refunded_amount":"0","splits":[],"adjustment":false}
        """#)
    }

    @Test func expenseIsNegativeAndIncomeIsPositive() throws {
        #expect(try transaction(type: "expense").signedAmount == Decimal(string: "-12.50"))
        #expect(try transaction(type: "income").signedAmount == Decimal(string: "12.50"))
    }

    @Test func titleFallsBackFromVendorToDescriptionToCategory() throws {
        #expect(try transaction(type: "expense").title == "Food")
        #expect(try transaction(type: "expense", vendor: #"{"id":"v","name":"Ooredoo"}"#).title == "Ooredoo")
        #expect(try transaction(type: "expense", description: "Lunch").title == "Lunch")
    }

    @Test func moneyIgnoresTheDeviceLocale() {
        #expect(Money.decimal("1234.5") == Decimal(string: "1234.5"))
        #expect(Money.decimal("abc") == nil)
    }

    @Test func groupingKeepsOrderAndSplitsByDay() throws {
        let days = TransactionDay.grouping([
            try transaction(type: "expense", date: "2026-11-12"),
            try transaction(type: "income", date: "2026-11-12"),
            try transaction(type: "expense", date: "2026-11-11"),
        ])
        #expect(days.map(\.date) == ["2026-11-12", "2026-11-11"])
        #expect(days.map(\.transactions.count) == [2, 1])
    }

    @Test func dayParsesItsDate() throws {
        let day = TransactionDay.grouping([try transaction(type: "expense", date: "2026-11-12")])[0]
        let parts = Calendar.current.dateComponents([.year, .month, .day], from: try #require(day.parsedDate))
        #expect(parts.year == 2026 && parts.month == 11 && parts.day == 12)
    }

    @Test func onlyPlainTransactionsAreEditable() throws {
        #expect(try transaction(type: "expense").canEdit)
        let refund = try decode(#"""
        {"id":"2","type":"income","amount":"5","to_amount":null,"currency":"MVR","exchange_rate":"1","base_amount":"5",
         "category":"Food","description":null,"transaction_date":"2026-11-12","transaction_time":null,"planned":false,
         "payment_method":"cash","account":null,"to_account":null,"vendor":null,"card":null,"subscription":null,
         "tags":[],"refund_of":{"id":"1"},"refunded_amount":"0","splits":[],"adjustment":false}
        """#)
        #expect(!refund.canEdit)
    }
}

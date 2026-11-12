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
        {"id":"1","type":"\#(type)","amount":"\#(amount)","to_amount":null,"currency":"MVR","category":"Food",
         "description":\#(text),"transaction_date":"\#(date)","planned":false,"account":{"id":"a","name":"BML"},
         "to_account":null,"vendor":\#(vendor),"refund_of":null}
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
}

import Foundation
import Testing
@testable import Maalu

struct SpendingStackTests {
    /// Four months, six expense categories and one income row.
    private let data: CategoryMonths = {
        func row(_ name: String, _ type: String, _ amounts: [String]) -> String {
            let total = amounts.compactMap { Double($0) }.reduce(0, +)
            let list = amounts.map { "\"\($0)\"" }.joined(separator: ",")
            return #"{"category_id":"\#(name)","category":"\#(name)","color":"blue","type":"\#(type)","parent":null,"amounts":[\#(list)],"total":"\#(total)"}"#
        }
        let json = #"""
        {"currency":"MVR","months":["2026-08","2026-09","2026-10","2026-11"],"categories":[
        \#(row("Rent", "expense", ["3000", "3000", "3000", "3200"])),
        \#(row("Food", "expense", ["900", "800", "1000", "1100"])),
        \#(row("Fun", "expense", ["400", "300", "500", "200"])),
        \#(row("Taxi", "expense", ["100", "120", "90", "80"])),
        \#(row("Gifts", "expense", ["50", "0", "60", "0"])),
        \#(row("Refunded", "expense", ["-70", "0", "0", "10"])),
        \#(row("Salary", "income", ["10000", "10000", "10000", "10000"]))]}
        """#
        return try! Api.decoder.decode(CategoryMonths.self, from: Data(json.utf8))
    }()

    @Test func theBiggestFourStayAndTheRestFoldIntoOther() throws {
        let stack = try #require(SpendingStack.make(from: data, last: 4))
        #expect(stack.names == ["Rent", "Food", "Fun", "Taxi", "Other"])
        #expect(stack.hasOther)
        // Gifts (110) and Refunded (10, its refund taken as nothing) make Other
        #expect(stack.months[0].value(of: "Other") == 50)
        #expect(stack.months[3].value(of: "Other") == 10)
    }

    @Test func onlyTheLastMonthsAreKept() throws {
        let stack = try #require(SpendingStack.make(from: data, last: 2))
        #expect(stack.months.map(\.id) == ["2026-10", "2026-11"])
    }

    @Test func incomeIsNotSpending() throws {
        let stack = try #require(SpendingStack.make(from: data, last: 4))
        #expect(!stack.names.contains("Salary"))
        // Rent 3000, Food 900, Fun 400, Taxi 100 and Other 50
        #expect(stack.months[0].total == 4450)
    }

    @Test func aMonthWithNothingSpentHasNoPieces() throws {
        let empty = CategoryMonths(currency: "MVR", months: ["2026-11"], categories: [])
        #expect(SpendingStack.make(from: empty, last: 6) == nil)
    }

    @Test func theReadingFollowsWhatIsPicked() throws {
        let stack = try #require(SpendingStack.make(from: data, last: 4))
        let november = stack.months[3]
        #expect(stack.reading(month: nil, held: nil).amount == stack.total)
        #expect(stack.reading(month: november, held: nil).amount == november.total)
        #expect(stack.reading(month: nil, held: "Rent").amount == 12200)
        #expect(stack.reading(month: november, held: "Rent").amount == 3200)
    }
}

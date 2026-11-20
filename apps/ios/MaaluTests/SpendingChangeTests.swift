import Foundation
import Testing
@testable import Maalu

struct SpendingChangeTests {
    @Test func nothingLastMonthMeansNothingToCompare() {
        #expect(SpendingChange(current: 100, previous: nil) == nil)
        #expect(SpendingChange(current: 100, previous: 0) == nil)
    }

    @Test func spendingUpIsBadAndDownIsGood() throws {
        let up = try #require(SpendingChange(current: 150, previous: 100))
        #expect(up.percent == 50 && !up.isGood && up.symbol == "arrow.up.right")
        #expect(up.text == "Up 50% on last month")
        let down = try #require(SpendingChange(current: 75, previous: 100))
        #expect(down.percent == -25 && down.isGood && down.symbol == "arrow.down.right")
        #expect(down.text == "Down 25% on last month")
        let same = try #require(SpendingChange(current: 100, previous: 100))
        #expect(same.isGood && same.text == "Same as last month")
    }
}

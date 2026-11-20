import Foundation
import Testing
@testable import Maalu

struct TransactionFilterChipTests {
    @Test func noFilterIsNoChip() {
        #expect(TransactionFilter().chips(accounts: [], categories: [], cards: [], tags: []).isEmpty)
        #expect(TransactionFilter(text: "rent").chips(accounts: [], categories: [], cards: [], tags: []).isEmpty)
    }

    @Test func everyFilterThatIsSetHasAChipThatRemovesIt() {
        var filter = TransactionFilter()
        filter.type = .expense
        filter.planned = true
        filter.dateFrom = .now
        filter.accountID = "a"
        filter.categoryID = "c"
        filter.cardID = "k"
        filter.paymentMethod = .cash
        filter.kind = .need
        filter.minAmount = 10
        filter.tagIDs = ["t"]
        let chips = filter.chips(accounts: [], categories: [], cards: [], tags: [])
        #expect(chips.count == 10)
        let cleared = chips.reduce(filter) { $0.removing($1.kind) }
        #expect(!cleared.isActive)
    }

    @Test func aChipUsesTheNameOfWhatItFilters() {
        var filter = TransactionFilter()
        filter.categoryID = "c"
        filter.minAmount = 10
        filter.maxAmount = 50
        let chips = filter.chips(accounts: [], categories: [NamedRef(id: "c", name: "Groceries")], cards: [], tags: [])
        #expect(chips.map(\.title) == ["Groceries", "≥ 10 ≤ 50"])
    }
}

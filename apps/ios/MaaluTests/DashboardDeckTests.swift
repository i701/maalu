import Foundation
import Testing
@testable import Maalu

@MainActor
struct DashboardDeckTests {
    @Test func theDeckHoldsTheTwoSummaryCards() {
        #expect(DashboardSection.allCases.filter(\.isInDeck) == [.available, .metrics])
    }

    @Test func aCardSwitchedOffLeavesTheDeckAndTheRestStayBelow() throws {
        let defaults = try #require(UserDefaults(suiteName: "DashboardDeckTests.\(UUID().uuidString)"))
        let model = DashboardModel(defaults: defaults)
        model.setHidden([.metrics])
        #expect(!model.deckSections.contains(.metrics))
        #expect(model.listSections.allSatisfy { !$0.isInDeck })
    }
}

struct KeptSplitTests {
    @Test func spendingIsItsShareOfIncomeAndTheRestIsKept() throws {
        let split = try #require(KeptSplit(income: 1000, spent: 250))
        #expect(split.spentShare == 0.25 && split.keptShare == 0.75)
    }

    @Test func spendingAboveIncomeLeavesNothingKept() throws {
        let split = try #require(KeptSplit(income: 100, spent: 300))
        #expect(split.spentShare == 1 && split.keptShare == 0)
    }

    @Test func noIncomeMeansNoSplit() {
        #expect(KeptSplit(income: 0, spent: 50) == nil)
    }
}

import Foundation
import Testing
@testable import Maalu

@MainActor
struct DashboardDeckTests {
    @Test func theDeckHoldsTheThreeSummaryCards() {
        #expect(DashboardSection.allCases.filter(\.isInDeck) == [.available, .metrics, .balance])
    }

    @Test func aCardSwitchedOffLeavesTheDeckAndTheRestStayBelow() throws {
        let defaults = try #require(UserDefaults(suiteName: "DashboardDeckTests.\(UUID().uuidString)"))
        let model = DashboardModel(defaults: defaults)
        model.setHidden([.metrics])
        #expect(!model.deckSections.contains(.metrics))
        #expect(model.listSections.allSatisfy { !$0.isInDeck })
    }
}

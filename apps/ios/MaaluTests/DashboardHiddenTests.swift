import Foundation
import Testing
@testable import Maalu

@MainActor
struct DashboardHiddenTests {
    private func freshDefaults() throws -> UserDefaults {
        try #require(UserDefaults(suiteName: "DashboardHiddenTests.\(UUID().uuidString)"))
    }

    @Test func aHiddenCardLeavesTheDashboardButStaysInTheArrangeList() throws {
        let model = DashboardModel(defaults: try freshDefaults())
        model.setHidden([.latest])
        #expect(!model.orderedSections.contains(.latest))
        #expect(model.arrangeableSections.contains(.latest))
    }

    @Test func theHiddenCardsAreRememberedByTheNextModel() throws {
        let defaults = try freshDefaults()
        DashboardModel(defaults: defaults).setHidden([.latest, .upcoming])
        #expect(DashboardModel(defaults: defaults).hidden == [.latest, .upcoming])
    }

    @Test func unknownSavedIdsAreIgnored() throws {
        let defaults = try freshDefaults()
        defaults.set(["latest", "gone-card"], forKey: "dashboardHiddenSections")
        #expect(DashboardModel(defaults: defaults).hidden == [.latest])
    }
}

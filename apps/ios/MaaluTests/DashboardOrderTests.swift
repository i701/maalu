import Foundation
import Testing
@testable import Maalu

struct DashboardOrderTests {
    private let visible: [DashboardSection] = [.metrics, .spending, .balance, .upcoming, .latest]

    @Test func noSavedOrderKeepsTheDefaultOne() {
        #expect(DashboardSection.ordered(saved: nil, visible: visible) == visible)
    }

    @Test func aSavedOrderComesFirstAndUnknownCardsGoLastInDefaultOrder() {
        let saved = ["latest", "spending"]
        #expect(DashboardSection.ordered(saved: saved, visible: visible) == [.latest, .spending, .metrics, .balance, .upcoming])
    }

    @Test func savedIdsThatAreNotOnShowOrUnknownAreSkipped() {
        let saved = ["credit", "nonsense", "balance", "metrics"]
        #expect(DashboardSection.ordered(saved: saved, visible: visible) == [.balance, .metrics, .spending, .upcoming, .latest])
    }

    @MainActor @Test func theOrderIsKeptOnTheDevice() throws {
        let suite = "DashboardOrderTests"
        let defaults = try #require(UserDefaults(suiteName: suite))
        defaults.removePersistentDomain(forName: suite)
        DashboardModel(defaults: defaults).saveLayout(order: [.latest, .metrics], hidden: [])
        #expect(DashboardModel(defaults: defaults).savedOrder == ["latest", "metrics"])
        DashboardModel(defaults: defaults).saveLayout(order: nil, hidden: [])
        #expect(DashboardModel(defaults: defaults).savedOrder == nil)
    }

    @Test func theProfileCarriesTheNameOrNone() throws {
        let named = #"{"name":"Aidhaan","base_currency":"MVR","default_account_id":null,"compact_numbers":false}"#
        #expect(try Api.decoder.decode(Profile.self, from: Data(named.utf8)).name == "Aidhaan")
        let unnamed = #"{"name":null,"base_currency":"MVR","default_account_id":null,"compact_numbers":false}"#
        #expect(try Api.decoder.decode(Profile.self, from: Data(unnamed.utf8)).name == nil)
    }
}

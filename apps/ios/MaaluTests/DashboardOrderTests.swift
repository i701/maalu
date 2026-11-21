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

    @Test func theIdsAreTheWebsSoOneSavedOrderArrangesBoth() {
        let web = ["available", "metrics", "spending", "balance", "monthly", "budget", "needs-wants", "money-flow", "credit", "upcoming", "latest"]
        #expect(web.allSatisfy { id in DashboardSection(rawValue: id) != nil })
    }

    @Test func theProfileCarriesTheSavedOrder() throws {
        let json = #"{"base_currency":"MVR","default_account_id":null,"compact_numbers":false,"dashboard_order":["latest","metrics"]}"#
        let profile = try Api.decoder.decode(Profile.self, from: Data(json.utf8))
        #expect(profile.dashboardOrder == ["latest", "metrics"])
    }

    @Test func theProfileCarriesTheNameOrNone() throws {
        let named = #"{"name":"Aidhaan","base_currency":"MVR","default_account_id":null,"compact_numbers":false,"dashboard_order":null}"#
        #expect(try Api.decoder.decode(Profile.self, from: Data(named.utf8)).name == "Aidhaan")
        let unnamed = #"{"name":null,"base_currency":"MVR","default_account_id":null,"compact_numbers":false,"dashboard_order":null}"#
        #expect(try Api.decoder.decode(Profile.self, from: Data(unnamed.utf8)).name == nil)
    }
}

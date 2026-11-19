import Foundation
import Testing
@testable import Maalu

struct PlacesTests {
    @Test func rangesCoverWhatTheWebsDo() throws {
        let month = try #require(PlaceRange.month.bounds(on: "2026-11-19"))
        #expect(month.from == "2026-11-01" && month.to == "2026-11-30")
        let three = try #require(PlaceRange.threeMonths.bounds(on: "2026-01-10"))
        #expect(three.from == "2025-11-01" && three.to == "2026-01-31")
        let year = try #require(PlaceRange.year.bounds(on: "2026-11-19"))
        #expect(year.from == "2026-01-01" && year.to == "2026-12-31")
        #expect(PlaceRange.all.bounds(on: "2026-11-19") == nil)
    }

    @Test func circlesGrowByAreaBetweenTheirSmallestAndLargest() {
        #expect(PlacesModel.diameter(of: 1000, largest: 1000) == 48)
        #expect(PlacesModel.diameter(of: 250, largest: 1000) == 31)
        #expect(PlacesModel.diameter(of: 0, largest: 1000) == 14)
        #expect(PlacesModel.diameter(of: 5, largest: 0) == 14)
    }

    @Test func aSpotIsNamedOrShownByItsCoordinates() throws {
        let totals = try Api.decoder.decode(PlaceTotals.self, from: Data(#"""
        {"currency":"MVR","places":[
         {"latitude":"4.175512","longitude":"73.509301","place":"Agora","count":3,"spent":"640.5000","last_date":"2026-11-12"},
         {"latitude":"4.175512","longitude":"73.509301","place":null,"count":1,"spent":"20","last_date":"2026-11-01"}]}
        """#.utf8))
        #expect(totals.places[0].label == "Agora")
        #expect(totals.places[1].label == "4.1755, 73.5093")
        #expect(totals.places[0].spentValue == Decimal(string: "640.5"))
        #expect(abs(totals.places[0].coordinate.latitude - 4.175512) < 0.000_001)
    }
}

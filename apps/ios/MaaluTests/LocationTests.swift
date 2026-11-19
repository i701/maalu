import CoreLocation
import Foundation
import Testing
@testable import Maalu

struct LocationTests {
    private func json(_ request: TransactionRequest) throws -> [String: Any] {
        try #require(try JSONSerialization.jsonObject(with: try JSONEncoder().encode(request)) as? [String: Any])
    }

    @Test func coordinatesAreReadAsAMapAppCopiesThem() throws {
        let comma = try #require(TransactionLocation.parse("4.1755, 73.5093"))
        #expect(comma.latitude == 4.1755 && comma.longitude == 73.5093)
        #expect(TransactionLocation.parse("4.1755 73.5093") != nil)
        #expect(TransactionLocation.parse("91, 10") == nil)
        #expect(TransactionLocation.parse("4.1755") == nil)
        #expect(TransactionLocation.parse("north, east") == nil)
    }

    @Test func aSpotIsSentWithSixDecimalsAndItsLongitudeFolded() {
        let spot = TransactionLocation(CLLocationCoordinate2D(latitude: 4.17551234, longitude: 433.5093))
        #expect(spot.latitude == "4.175512")
        #expect(spot.longitude == "73.509300")
        #expect(spot.label == "4.1755, 73.5093")
        #expect(TransactionLocation(latitude: "4.1", longitude: "73.5", place: " Agora ").label == "Agora")
    }

    @Test func aNewTransactionSendsItsSpotAndAnEditCanTakeItOff() throws {
        var draft = TransactionDraft()
        draft.amount = 10
        draft.category = "Food"
        draft.location = TransactionLocation(latitude: "4.175512", longitude: "73.509301", place: "")
        let body = try json(draft.request(accounts: [], baseCurrency: "MVR", editing: nil))
        #expect(body["latitude"] as? String == "4.175512")
        #expect(body["longitude"] as? String == "73.509301")
        #expect(body["place"] is NSNull)
        #expect(draft.nextEntry().location == draft.location)

        var plain = TransactionDraft()
        plain.amount = 10
        let none = try json(plain.request(accounts: [], baseCurrency: "MVR", editing: nil))
        #expect(none["latitude"] == nil)
    }

    @MainActor @Test func thePinKeepsATypedNameAndASearchNamesItOtherwise() {
        let model = LocationPickerModel(location: nil)
        model.drop(at: CLLocationCoordinate2D(latitude: 4.1, longitude: 73.5), naming: "Agora")
        #expect(model.placeName == "Agora")
        model.placeName = "My shop"
        model.drop(at: CLLocationCoordinate2D(latitude: 4.2, longitude: 73.5), naming: "Other")
        #expect(model.placeName == "My shop")
        model.typedCoordinates = "nonsense"
        #expect(model.useTyped() == nil)
        #expect(model.location?.latitude == "4.200000")
        model.remove()
        #expect(model.location == nil)
    }
}

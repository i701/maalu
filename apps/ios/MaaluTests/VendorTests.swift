import Foundation
import Testing
@testable import Maalu

struct VendorTests {
    private func vendor(_ id: String, name: String, isLocal: Bool? = nil, address: String? = nil, contact: String? = nil, spot: (String, String, String)? = nil) throws -> Vendor {
        let local = isLocal.map { $0 ? "true" : "false" } ?? "null"
        let quoted = { (text: String?) in text.map { "\"\($0)\"" } ?? "null" }
        let (latitude, longitude, place) = (quoted(spot?.0), quoted(spot?.1), quoted(spot?.2))
        return try Api.decoder.decode(Vendor.self, from: Data(#"""
        {"id":"\#(id)","name":"\#(name)","address":\#(quoted(address)),"contact":\#(quoted(contact)),"is_local":\#(local),
         "currency":null,"default_category":"Groceries","default_tags":[{"id":"t","name":"Weekly"}],
         "latitude":\#(latitude),"longitude":\#(longitude),"place":\#(place),"created_at":"2026-11-01T10:00:00Z"}
        """#.utf8))
    }

    @Test func theListFiltersByLocalityAndSearchesNameContactAndAddress() throws {
        let all = [
            try vendor("a", name: "Agora", isLocal: true, address: "Majeedhee Magu"),
            try vendor("b", name: "Amazon", isLocal: false),
            try vendor("c", name: "Corner shop", contact: "7771234"),
        ]
        let ids = { (locality: VendorLocality, search: String) in VendorsModel.matching(all, locality: locality, search: search).map(\.id) }
        #expect(ids(.all, "") == ["a", "b", "c"])
        #expect(ids(.local, "") == ["a"])
        #expect(ids(.foreign, "") == ["b"])
        #expect(ids(.unknown, "") == ["c"])
        #expect(ids(.all, "majeedhee") == ["a"])
        #expect(ids(.all, "777") == ["c"])
        #expect(ids(.foreign, "agora").isEmpty)
        #expect(all[0].defaultTags.map(\.name) == ["Weekly"])
    }

    @Test func aSaveSendsEveryFieldSoAClearedOneIsNull() throws {
        var draft = VendorDraft(editing: try vendor("a", name: "Agora", isLocal: true, address: "Majeedhee Magu"))
        draft.address = "  "
        draft.defaultCategory = ""
        draft.defaultTags = []
        draft.isLocal = nil
        let encoder = JSONEncoder()
        let body = try #require(try JSONSerialization.jsonObject(with: try encoder.encode(draft.request)) as? [String: Any])
        #expect(body["name"] as? String == "Agora")
        #expect(body["address"] is NSNull)
        #expect(body["is_local"] is NSNull)
        #expect(body["default_category"] is NSNull)
        #expect(body["default_tags"] as? [String] == [])
        #expect(body["latitude"] is NSNull)
    }

    @Test func aUsualPlaceIsKeptOnASaveAndClearedAsAWholeSpot() throws {
        let marked = try vendor("a", name: "Agora", spot: ("4.175500", "73.509300", "Agora"))
        #expect(marked.location == TransactionLocation(latitude: "4.175500", longitude: "73.509300", place: "Agora"))
        var draft = VendorDraft(editing: marked)
        let encoder = JSONEncoder()
        let kept = try #require(try JSONSerialization.jsonObject(with: try encoder.encode(draft.request)) as? [String: Any])
        #expect(kept["latitude"] as? String == "4.175500")
        #expect(kept["place"] as? String == "Agora")

        draft.location = nil
        let cleared = try #require(try JSONSerialization.jsonObject(with: try encoder.encode(draft.request)) as? [String: Any])
        #expect(cleared["latitude"] is NSNull && cleared["longitude"] is NSNull && cleared["place"] is NSNull)
        #expect(try vendor("b", name: "Amazon").location == nil)
    }
}

import Foundation
import Testing
@testable import Maalu

struct VendorTests {
    private func vendor(_ id: String, name: String, isLocal: Bool? = nil, address: String? = nil, contact: String? = nil) throws -> Vendor {
        let local = isLocal.map { $0 ? "true" : "false" } ?? "null"
        let quoted = { (text: String?) in text.map { "\"\($0)\"" } ?? "null" }
        return try Api.decoder.decode(Vendor.self, from: Data(#"""
        {"id":"\#(id)","name":"\#(name)","address":\#(quoted(address)),"contact":\#(quoted(contact)),"is_local":\#(local),
         "currency":null,"default_category":"Groceries","default_tags":[{"id":"t","name":"Weekly"}],
         "latitude":null,"longitude":null,"place":null,"created_at":"2026-11-01T10:00:00Z"}
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
        #expect(body["latitude"] == nil)
    }
}

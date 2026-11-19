import Foundation
import Testing
@testable import Maalu

struct TagTests {
    @Test func aTagCarriesItsColourAndHowMuchUsesIt() throws {
        let tags = try Api.decoder.decode([TagRecord].self, from: Data(#"""
        [{"id":"t","name":"Trip","color":"orange","created_at":"2026-11-01T10:00:00Z","transaction_count":12,"template_count":1}]
        """#.utf8))
        #expect(tags.first?.color == "orange")
        #expect(tags.first?.transactionCount == 12)
        #expect(tags.first?.templateCount == 1)
        #expect(TagNaming.rename(try #require(tags.first)).tag?.id == "t")
        #expect(TagNaming.add.tag == nil)
    }
}

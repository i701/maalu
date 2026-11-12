import Foundation
import Testing
@testable import Maalu

struct SuggestionDraftTests {
    private func candidate(confidence: String = "high") throws -> SubscriptionCandidate {
        let json = """
        {"vendor_id":"v1","vendor_name":"Netflix","currency":"MVR","amount":"150.0000","amount_varies":false,
         "interval_unit":"month","interval_count":1,"occurrences":4,"first_date":"2026-07-01","last_date":"2026-10-01",
         "next_due":"2026-11-01","confidence":"\(confidence)","category":"Entertainment"}
        """
        return try Api.decoder.decode(SubscriptionCandidate.self, from: Data(json.utf8))
    }

    private func json(_ request: SuggestionRequest) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        let data = try encoder.encode(request)
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    @Test func acceptingAsIsSendsOnlyTheKey() throws {
        let candidate = try candidate()
        let body = try json(SuggestionDraft(candidate).request(for: candidate))
        #expect(Set(body.keys) == ["vendor_id", "currency"])
        #expect(body["vendor_id"] as? String == "v1")
    }

    @Test func acceptingSendsOnlyWhatWasChanged() throws {
        let candidate = try candidate()
        var draft = SuggestionDraft(candidate)
        draft.name = "Netflix Premium"
        draft.amount = 180
        draft.count = 2
        draft.unit = .week
        let body = try json(draft.request(for: candidate))
        #expect(body["name"] as? String == "Netflix Premium")
        #expect(body["amount"] as? String == "180")
        #expect(body["interval_count"] as? Int == 2)
        #expect(body["interval_unit"] as? String == "week")
    }

    @Test func theDraftStartsFromTheSuggestion() throws {
        let draft = SuggestionDraft(try candidate())
        #expect(draft.name == "Netflix")
        #expect(draft.amount == 150)
        #expect(draft.problem == nil)
    }

    @Test func aBlankNameOrZeroAmountIsAProblem() throws {
        var draft = SuggestionDraft(try candidate())
        draft.name = " "
        #expect(draft.problem != nil)
        draft.name = "Netflix"
        draft.amount = 0
        #expect(draft.problem != nil)
    }

    @Test func theDetailLineSaysHowSureItIs() throws {
        #expect(try candidate().detailLine.contains("looks regular"))
        #expect(try candidate(confidence: "medium").detailLine.contains("looser fit"))
        #expect(try candidate().detailLine.hasPrefix("every month · seen 4 times"))
    }

    @Test func aVendorChargedInTwoCurrenciesIsTwoSuggestions() throws {
        let one = try candidate()
        #expect(one.id == "v1-MVR")
    }
}

import Foundation
import Testing
@testable import Maalu

struct GoalDraftTests {
    private func goal(account: String? = nil, monthly: String? = "500.0000", date: String? = "2027-03-01") throws -> Goal {
        let accountJSON = account.map { #"{"id":"\#($0)","name":"MIB Savings","currency":"MVR"}"# } ?? "null"
        let monthlyJSON = monthly.map { "\"\($0)\"" } ?? "null"
        let dateJSON = date.map { "\"\($0)\"" } ?? "null"
        return try Api.decoder.decode(Goal.self, from: Data(#"""
        {"id":"g","name":"Holiday","currency":"MVR","saved":"100","target_amount":"12000.0000","remaining":"11900","percent":1,
         "reached":false,"account":\#(accountJSON),"monthly_amount":\#(monthlyJSON),"target_date":\#(dateJSON),"months_left":4,
         "needed_per_month":"1000","period_status":null,"period_planned":null,"period_contributed":null}
        """#.utf8))
    }

    private func json<T: Encodable>(_ value: T) throws -> [String: Any] {
        let encoder = JSONEncoder()
        encoder.keyEncodingStrategy = .convertToSnakeCase
        return try #require(try JSONSerialization.jsonObject(with: try encoder.encode(value)) as? [String: Any])
    }

    @Test func aGoalNeedsANameAndATargetAboveZero() {
        var draft = GoalDraft()
        #expect(draft.problem != nil)
        draft.name = "Trip"
        #expect(draft.problem != nil)
        draft.target = 0
        #expect(draft.problem != nil)
        draft.target = 5000
        #expect(draft.problem == nil)
        draft.monthly = 0
        #expect(draft.problem != nil)
        draft.monthly = 400
        #expect(draft.problem == nil)
    }

    @Test func aCreateRequestLeavesOutWhatIsNotSet() throws {
        var draft = GoalDraft()
        draft.name = " Trip "
        draft.target = 5000
        let body = try json(draft.createRequest())
        #expect(body["name"] as? String == "Trip")
        #expect(body["target_amount"] as? String == "5000")
        #expect(body["account_id"] == nil)
        #expect(body["monthly_amount"] == nil)
        #expect(body["target_date"] == nil)

        draft.hasTargetDate = true
        #expect(try json(draft.createRequest())["target_date"] as? String != nil)
    }

    @Test func editingReadsTheGoalBack() throws {
        let draft = GoalDraft(editing: try goal(account: "a1"))
        #expect(draft.name == "Holiday")
        #expect(draft.target == 12000)
        #expect(draft.monthly == 500)
        #expect(draft.accountID == "a1")
        #expect(draft.hasTargetDate)
    }

    @Test func anEditSendsOnlyWhatChanged() throws {
        let original = GoalDraft(editing: try goal())
        var changed = original
        changed.target = 15000
        let body = try json(changed.patchRequest(from: original))
        #expect(body["target_amount"] as? String == "15000")
        #expect(body["name"] == nil)
        #expect(body["monthly_amount"] == nil)
        #expect(body["target_date"] == nil)
    }

    @Test func clearingAFieldOnAnEditSendsAnExplicitNull() throws {
        let original = GoalDraft(editing: try goal(account: "a1"))
        var changed = original
        changed.accountID = nil
        changed.monthly = nil
        changed.hasTargetDate = false
        let body = try json(changed.patchRequest(from: original))
        #expect(body["account_id"] is NSNull)
        #expect(body["monthly_amount"] is NSNull)
        #expect(body["target_date"] is NSNull)
        #expect(body["name"] == nil)
    }

    @Test func settingMoneyAsideIsPositiveAndTakingItOutIsNegative() throws {
        var draft = GoalMoneyDraft()
        #expect(draft.problem != nil)
        draft.amount = 250
        #expect(draft.problem == nil)
        #expect(draft.request(on: .now).amount == "250")
        draft.direction = .take
        #expect(draft.request(on: .now).amount == "-250")
        draft.note = "  "
        #expect(draft.request(on: .now).note == nil)
        draft.note = "Bonus"
        #expect(draft.request(on: .now).note == "Bonus")
    }
}

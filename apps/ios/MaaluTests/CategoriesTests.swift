import Foundation
import Testing
@testable import Maalu

struct CategoriesTests {
    private func categoryJSON(
        id: String = "1",
        name: String = "Groceries",
        color: String = "green",
        kind: String? = nil,
        effectiveKind: String? = nil,
        isSalary: Bool = false,
        parentId: String? = nil,
        parent: String? = nil,
        childCount: Int = 0,
        transactionCount: Int = 3,
        subscriptionCount: Int = 0
    ) -> String {
        let null = "null"
        return #"""
        {"id":"\#(id)","name":"\#(name)","color":"\#(color)","kind":\#(kind.map { "\"\($0)\"" } ?? null),
         "effective_kind":\#(effectiveKind.map { "\"\($0)\"" } ?? null),"is_salary":\#(isSalary),
         "parent_id":\#(parentId.map { "\"\($0)\"" } ?? null),"parent":\#(parent.map { "\"\($0)\"" } ?? null),
         "child_count":\#(childCount),"created_at":"2026-11-12T00:00:00Z","transaction_count":\#(transactionCount),
         "subscription_count":\#(subscriptionCount),"budget_line_count":0}
        """#
    }

    private func category(from json: String) throws -> Maalu.Category {
        try Api.decoder.decode(Maalu.Category.self, from: Data(json.utf8))
    }

    private func categories() throws -> [Maalu.Category] {
        [
            try category(from: categoryJSON(id: "food", name: "Food", color: "green", kind: "need", effectiveKind: "need", childCount: 1, transactionCount: 5)),
            try category(from: categoryJSON(id: "groceries", name: "Groceries", color: "lime", parentId: "food", parent: "Food", transactionCount: 3)),
            try category(from: categoryJSON(id: "salary", name: "Salary", color: "green", isSalary: true, transactionCount: 2)),
            try category(from: categoryJSON(id: "fun", name: "Fun", color: "orange", kind: "want", effectiveKind: "want")),
        ]
    }

    private func body(_ request: some Encodable) throws -> [String: Any] {
        let data = try JSONEncoder().encode(request)
        return try #require(try JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    @Test func decodingMapsTheWireNames() throws {
        let category = try category(from: categoryJSON(kind: "want", effectiveKind: "want", parentId: "food", parent: "Food", childCount: 2, transactionCount: 4, subscriptionCount: 1))
        #expect(category.id == "1")
        #expect(category.name == "Groceries")
        #expect(category.color == "green")
        #expect(category.kind == .want)
        #expect(category.effectiveKind == .want)
        #expect(category.isSalary == false)
        #expect(category.parentId == "food")
        #expect(category.parent == "Food")
        #expect(category.childCount == 2)
        #expect(category.transactionCount == 4)
        #expect(category.subscriptionCount == 1)
    }

    @Test func pathJoinsTheParent() throws {
        let top = try category(from: categoryJSON(name: "Food"))
        #expect(top.path == "Food")
        let child = try category(from: categoryJSON(name: "Groceries", parent: "Food"))
        #expect(child.path == "Food › Groceries")
    }

    @Test func summaryLinesUpKindSalaryAndCounts() throws {
        let salary = try category(from: categoryJSON(name: "Salary", isSalary: true, transactionCount: 2))
        #expect(salary.summary == "Not sorted · Default · pay · 2 transactions")

        let food = try category(from: categoryJSON(name: "Food", kind: "need", effectiveKind: "need", childCount: 1, transactionCount: 5))
        #expect(food.summary == "Need · 1 sub-category · 5 transactions")

        let child = try category(from: categoryJSON(name: "Groceries", parent: "Food", transactionCount: 3))
        #expect(child.summary == "Not sorted · 3 transactions")

        let inherited = try category(from: categoryJSON(name: "Groceries", effectiveKind: "need", parent: "Food", transactionCount: 1, subscriptionCount: 1))
        #expect(inherited.summary == "Need · from Food · 1 transaction · 1 subscription")
    }

    @Test func parentChoicesAreTopLevelOnesOtherThanItself() throws {
        let all = try categories()
        let food = all[0]
        #expect(CategoryLogic.parentChoices(from: all, for: food).isEmpty)
        let groceries = all[1]
        let choices = CategoryLogic.parentChoices(from: all, for: groceries)
        #expect(choices.map(\.id) == ["food", "salary", "fun"])
        #expect(CategoryLogic.parentChoices(from: all, for: nil).map(\.id) == ["food", "salary", "fun"])
    }

    @Test func mergeTargetsAreEveryOtherCategory() throws {
        let all = try categories()
        #expect(CategoryLogic.mergeTargets(from: all, for: all[0]).map(\.id) == ["groceries", "salary", "fun"])
    }

    @Test func requestSendsParentAndKindEvenWhenEmptyAndOmitsAnUnsetColour() throws {
        let body = try self.body(CategoryRequest(name: "Books", color: nil, parentId: nil, kind: .need))
        #expect(body["name"] as? String == "Books")
        #expect(body["color"] == nil)
        #expect(body["parent_id"] is NSNull)
        #expect(body["kind"] as? String == "need")

        let cleared = try self.body(CategoryRequest(name: "Books", color: "lime", parentId: "food", kind: nil))
        #expect(cleared["color"] as? String == "lime")
        #expect(cleared["parent_id"] as? String == "food")
        #expect(cleared["kind"] is NSNull)
    }

    @Test func mergeRequestUsesTheApisSpelling() throws {
        let body = try self.body(CategoryMergeRequest(intoId: "food"))
        #expect(body["into_id"] as? String == "food")
    }

    @Test func kindRequestSendsIdsAndAnExplicitNullKind() throws {
        let body = try self.body(CategoryKindRequest(ids: ["1", "2"], kind: nil))
        #expect(body["ids"] as? [String] == ["1", "2"])
        #expect(body["kind"] is NSNull)

        let set = try self.body(CategoryKindRequest(ids: ["1"], kind: .want))
        #expect(set["kind"] as? String == "want")
    }

    @Test @MainActor func sortChangesGroupByTheNewKind() throws {
        let model = SortKindsModel(categories: try categories())
        #expect(model.changedCount == 0)

        model.choices[0].kind = nil // Food: need -> cleared
        model.choices[1].kind = .need // Groceries: unsorted -> need
        model.choices[3].kind = .want // Fun: want -> want (unchanged)
        let changes = model.changes()
        #expect(changes.cleared == ["food"])
        #expect(changes.needs == ["groceries"])
        #expect(changes.wants.isEmpty)
        #expect(model.changedCount == 2)
    }
}

import Foundation
import Testing
@testable import Maalu

struct IncomeRuleTests {
    private func category(_ name: String, _ total: String, type: String = "expense", kind: String? = nil) -> CategoryTotal {
        CategoryTotal(categoryId: name, category: name, color: "blue", total: total, type: type, kind: kind)
    }

    private func rule(_ categories: [CategoryTotal]) throws -> IncomeRule {
        try #require(IncomeRule.make(from: categories))
    }

    @Test func noIncomeMeansNoRule() {
        #expect(IncomeRule.make(from: []) == nil)
        #expect(IncomeRule.make(from: [category("Rent", "100", kind: "need")]) == nil)
    }

    @Test func eachRowIsAShareOfIncomeJudgedAgainstItsTarget() throws {
        let result = try rule([
            category("Pay", "10000", type: "income"),
            category("Rent", "4000", kind: "need"),
            category("Fun", "3500", kind: "want"),
        ])
        let rows = Dictionary(uniqueKeysWithValues: result.rows.map { ($0.key, $0) })
        #expect(rows[.need]?.percent == 40)
        #expect(rows[.need]?.status == .on)
        #expect(rows[.want]?.percent == 35)
        #expect(rows[.want]?.status == .over)
        #expect(rows[.save]?.percent == 25)
        #expect(rows[.save]?.status == .on)
    }

    @Test func exactlyOnTargetIsOnTarget() throws {
        let result = try rule([
            category("Pay", "1000", type: "income"),
            category("Rent", "500", kind: "need"),
            category("Fun", "300", kind: "want"),
        ])
        #expect(result.rows.allSatisfy { $0.status == .on })
    }

    @Test func keptIsIncomeLessAllSpendingAndCanBeNegative() throws {
        let result = try rule([
            category("Pay", "1000", type: "income"),
            category("Rent", "800", kind: "need"),
            category("Misc", "400"),
        ])
        let kept = try #require(result.rows.first { $0.key == .save })
        #expect(kept.amount == -200)
        #expect(kept.status == .below)
        #expect(result.unsorted == 400)
        #expect(result.unsortedPercent == 40)
    }
}

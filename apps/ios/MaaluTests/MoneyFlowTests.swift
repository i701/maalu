import Foundation
import SwiftUI
import Testing
@testable import Maalu

struct MoneyFlowTests {
    private func category(_ name: String, _ total: String, type: String = "expense") -> CategoryTotal {
        CategoryTotal(categoryId: name, category: name, color: "blue", total: total, type: type, kind: nil)
    }

    private func flow(_ categories: [CategoryTotal], top: Int = 5) throws -> MoneyFlow {
        try #require(MoneyFlow.make(from: categories, top: top))
    }

    @Test func nothingToShowWithoutIncomeOrSpending() {
        #expect(MoneyFlow.make(from: []) == nil)
        #expect(MoneyFlow.make(from: [category("Zero", "0")]) == nil)
    }

    @Test func whatIsNotSpentIsSaved() throws {
        let result = try flow([category("Pay", "1000", type: "income"), category("Rent", "600")])
        #expect(result.total == 1000)
        #expect(result.nodes.first { $0.kind == .saved }?.value == 400)
        #expect(result.nodes.first { $0.kind == .deficit } == nil)
        let leaving = result.links.filter { $0.source == "total" }.reduce(0) { $0 + $1.value }
        #expect(leaving == 1000)
    }

    @Test func spendingBeyondIncomeIsOverspent() throws {
        let result = try flow([category("Pay", "500", type: "income"), category("Rent", "800")])
        #expect(result.total == 800)
        #expect(result.nodes.first { $0.kind == .deficit }?.value == 300)
        let entering = result.links.filter { $0.target == "total" }.reduce(0) { $0 + $1.value }
        #expect(entering == 800)
    }

    @Test func theTailFoldsIntoOtherButASingleRowIsNotHidden() throws {
        let many = (1...8).map { category("C\($0)", String($0)) }
        let folded = try flow(many, top: 5)
        #expect(folded.nodes.filter { $0.kind == .spending }.count == 6)
        #expect(folded.nodes.contains { $0.label == "Other spending" && $0.value == 6 })

        let six = try flow((1...6).map { category("C\($0)", String($0)) }, top: 5)
        #expect(six.nodes.filter { $0.kind == .spending }.count == 6)
        #expect(!six.nodes.contains { $0.label == "Other spending" })
    }

    @Test func layoutKeepsEveryLinkInsideItsNodesAndOnOneScale() throws {
        let result = try flow([
            category("Pay", "1000", type: "income"),
            category("Rent", "600"), category("Food", "300"),
        ])
        let layout = FlowLayout.make(result, width: 300, height: 200)
        #expect(layout.nodes.count == result.nodes.count)
        #expect(layout.links.count == result.links.count)
        let total = try #require(layout.node("total"))
        let entering = layout.links.filter { $0.link.target == "total" }
        let band = entering.reduce(0) { $0 + $1.thickness }
        #expect(band <= total.height + 0.001)
        for link in layout.links {
            #expect(link.thickness > 0)
            #expect(link.x0 < link.x1)
        }
        for node in layout.nodes {
            #expect(node.y >= -0.001 && node.y + node.height <= 200.001)
        }
    }

    @Test func labelsAreKeptApartAndInsideTheBox() {
        let spread = LabelSpread.positions([10, 12, 14, 200], gap: 30, limit: 220)
        let sorted = spread.sorted()
        #expect(zip(sorted, sorted.dropFirst()).allSatisfy { $1 - $0 >= 30 - 0.001 })
        #expect(spread.allSatisfy { $0 >= 0 && $0 <= 220 })
    }

    @Test func outgoingBandsStartAsTheIncomeBandTheyContinueFrom() throws {
        let result = try flow([
            category("Pay", "1000", type: "income"),
            category("Rent", "600"), category("Food", "300"),
        ])
        let layout = FlowLayout.make(result, width: 300, height: 200)
        for link in layout.links {
            let incoming = link.link.target == "total"
            let start = layout.nodeColor(of: link, incoming: incoming, start: true)
            let end = layout.nodeColor(of: link, incoming: incoming, start: false)
            if incoming {
                #expect(start == end)
            } else {
                #expect(start == Color(flow: .income))
            }
        }
        let rent = try #require(layout.links.first { $0.link.target == "out:0" })
        #expect(layout.nodeColor(of: rent, incoming: false, start: false) == Color(flow: .spending))
        let saved = try #require(layout.links.first { $0.link.target == "saved" })
        #expect(layout.nodeColor(of: saved, incoming: false, start: false) == Color(flow: .saved))
    }

    @Test func aTapResolvesToTheNodeBehindTheBandOrBar() throws {
        let result = try flow([
            category("Pay", "1000", type: "income"),
            category("Rent", "600"), category("Food", "300"),
        ])
        let layout = FlowLayout.make(result, width: 300, height: 200)

        let incomeBar = try #require(layout.node("in:0"))
        #expect(layout.nodeID(at: CGPoint(x: incomeBar.x + 2, y: incomeBar.centerY)) == "in:0")

        let rent = try #require(layout.links.first { $0.link.target == "out:0" })
        let rentX = (layout.seam + rent.x1) / 2
        #expect(layout.nodeID(at: CGPoint(x: rentX, y: layout.bandCenterY(rent, atX: rentX))) == "out:0")

        let income = try #require(layout.links.first { $0.link.target == "total" })
        let incomeX = (income.x0 + layout.seam) / 2
        #expect(layout.nodeID(at: CGPoint(x: incomeX, y: layout.bandCenterY(income, atX: incomeX))) == "in:0")

        #expect(layout.nodeID(at: CGPoint(x: 150, y: -50)) == nil)
    }

    @Test func aBandsCentreLineMeetsItsEndpoints() throws {
        let result = try flow([category("Pay", "1000", type: "income"), category("Rent", "600")])
        let layout = FlowLayout.make(result, width: 300, height: 200)
        let rent = try #require(layout.links.first { $0.link.target == "out:0" })
        #expect(abs(layout.bandCenterY(rent, atX: layout.seam) - rent.y0) < 0.5)
        #expect(abs(layout.bandCenterY(rent, atX: rent.x1) - rent.y1) < 0.5)
    }
}

import Foundation

/// Where a period's money came from and where it went: income categories into one total, out to spending categories.
/// Money earned and not spent is a "Saved" use and money spent beyond what came in is an "Overspent" source, so both
/// sides always add up to the same total.
struct MoneyFlow {
    enum Kind { case income, deficit, total, spending, saved }

    struct Node: Identifiable {
        let id: String
        let label: String
        let column: Int
        let value: Double
        let kind: Kind
    }

    struct Link: Identifiable {
        let source: String
        let target: String
        let value: Double

        var id: String { "\(source)>\(target)" }
    }

    let nodes: [Node]
    let links: [Link]

    var total: Double { nodes.first { $0.kind == .total }?.value ?? 0 }

    /// Nil when there is neither income nor spending.
    static func make(from categories: [CategoryTotal], top: Int = 5) -> MoneyFlow? {
        let sources = biggest(of: categories.filter { !$0.isExpense }, top: top, other: String(localized: "Other income"))
        let uses = biggest(of: categories.filter(\.isExpense), top: top, other: String(localized: "Other spending"))
        let income = sources.reduce(0) { $0 + $1.value }
        let spent = uses.reduce(0) { $0 + $1.value }
        guard income > 0 || spent > 0 else { return nil }

        var nodes: [Node] = []
        var links: [Link] = []
        for (index, source) in sources.enumerated() {
            nodes.append(Node(id: "in:\(index)", label: source.label, column: 0, value: source.value, kind: .income))
            links.append(Link(source: "in:\(index)", target: "total", value: source.value))
        }
        if spent > income {
            nodes.append(Node(id: "deficit", label: String(localized: "Overspent"), column: 0, value: spent - income, kind: .deficit))
            links.append(Link(source: "deficit", target: "total", value: spent - income))
        }
        nodes.append(Node(id: "total", label: String(localized: "Total"), column: 1, value: max(income, spent), kind: .total))
        for (index, use) in uses.enumerated() {
            nodes.append(Node(id: "out:\(index)", label: use.label, column: 2, value: use.value, kind: .spending))
            links.append(Link(source: "total", target: "out:\(index)", value: use.value))
        }
        if income > spent {
            nodes.append(Node(id: "saved", label: String(localized: "Saved"), column: 2, value: income - spent, kind: .saved))
            links.append(Link(source: "total", target: "saved", value: income - spent))
        }
        return MoneyFlow(nodes: nodes, links: links)
    }

    private struct Row {
        let label: String
        let value: Double
    }

    /// The biggest rows, the rest folded into one "Other" row; empty and negative ones dropped.
    private static func biggest(of categories: [CategoryTotal], top: Int, other: String) -> [Row] {
        let sorted = categories
            .map { Row(label: $0.category, value: NSDecimalNumber(decimal: $0.value).doubleValue) }
            .filter { $0.value > 0 }
            .sorted { $0.value > $1.value }
        if sorted.count <= top + 1 { return sorted }
        return Array(sorted.prefix(top)) + [Row(label: other, value: sorted.dropFirst(top).reduce(0) { $0 + $1.value })]
    }
}

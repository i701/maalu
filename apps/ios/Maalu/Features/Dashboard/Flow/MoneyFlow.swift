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

    /// The right-most column in use: 2 for a flat flow, 3 when a spending group has sub-categories under it.
    var lastColumn: Int { nodes.map(\.column).max() ?? 0 }

    /// How many nodes the fullest column holds, which is what sets the height a diagram needs.
    var tallestColumn: Int {
        (0...lastColumn).map { column in nodes.filter { $0.column == column }.count }.max() ?? 0
    }

    /// Nil when there is neither income nor spending.
    static func make(from categories: [CategoryTotal], top: Int = 5) -> MoneyFlow? {
        let sources = biggest(of: categories.filter { !$0.isExpense }.map(row), top: top, other: String(localized: "Other income"))
        let uses = biggest(of: spendingGroups(categories), top: top, other: String(localized: "Other spending"))
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
        // what each group was spent on, in the groups' order so no band crosses another
        for (index, use) in uses.enumerated() {
            let children = biggest(of: use.children, top: top, other: String(localized: "Other \(use.label)"))
            for (childIndex, child) in children.enumerated() {
                nodes.append(Node(id: "out:\(index):\(childIndex)", label: child.label, column: 3, value: child.value, kind: .spending))
                links.append(Link(source: "out:\(index)", target: "out:\(index):\(childIndex)", value: child.value))
            }
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
        var children: [Row] = []
    }

    private static func row(_ category: CategoryTotal) -> Row {
        Row(label: category.category, value: NSDecimalNumber(decimal: category.value).doubleValue)
    }

    /// Spending as groups: a sub-category goes under its parent, and a parent's own spending becomes an "(other)" child
    /// beside its sub-categories. A category with no parent and no children is a group of its own with nothing under it.
    private static func spendingGroups(_ categories: [CategoryTotal]) -> [Row] {
        var order: [String] = []
        var families: [String: (label: String, own: Double, children: [Row])] = [:]
        for category in categories where category.isExpense {
            let item = row(category)
            guard item.value > 0 else { continue }
            let key = category.parentId ?? category.categoryId
            if families[key] == nil {
                order.append(key)
                families[key] = (category.parent ?? category.category, 0, [])
            }
            if category.parentId != nil {
                families[key]?.children.append(item)
            } else {
                families[key]?.own += item.value
            }
        }
        return order.compactMap { families[$0] }.map { family in
            let hasChildren = !family.children.isEmpty
            let own = family.own > 0 && hasChildren ? [Row(label: String(localized: "\(family.label) (other)"), value: family.own)] : []
            return Row(label: family.label, value: family.own + family.children.reduce(0) { $0 + $1.value }, children: family.children + own)
        }
    }

    /// The biggest rows, the rest folded into one "Other" row; empty and negative ones dropped.
    private static func biggest(of rows: [Row], top: Int, other: String) -> [Row] {
        let sorted = rows.filter { $0.value > 0 }.sorted { $0.value > $1.value }
        if sorted.count <= top + 1 { return sorted }
        return Array(sorted.prefix(top)) + [Row(label: other, value: sorted.dropFirst(top).reduce(0) { $0 + $1.value })]
    }
}

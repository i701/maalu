import Foundation

struct MoreItem: Identifiable {
    let title: String
    let systemImage: String
    var id: String { title }
}

struct MoreGroup: Identifiable {
    let name: String
    let items: [MoreItem]
    var id: String { name }
}

/// The destinations outside the four tabs, grouped like the web's sidebar.
enum MoreDestinations {
    static let groups: [MoreGroup] = [money, planning, organise, help]

    private static let money = MoreGroup(name: "Money", items: [
        MoreItem(title: "Compare", systemImage: "arrow.left.arrow.right"),
        MoreItem(title: "Trends", systemImage: "calendar"),
        MoreItem(title: "Net worth", systemImage: "chart.line.uptrend.xyaxis"),
        MoreItem(title: "Places", systemImage: "map"),
    ])

    private static let planning = MoreGroup(name: "Planning", items: [
        MoreItem(title: "Month plan", systemImage: "checklist"),
        MoreItem(title: "Pending", systemImage: "checkmark.circle"),
        MoreItem(title: "Subscriptions", systemImage: "repeat"),
        MoreItem(title: "Goals", systemImage: "target"),
    ])

    private static let organise = MoreGroup(name: "Organise", items: [
        MoreItem(title: "Categories", systemImage: "folder"),
        MoreItem(title: "Tags", systemImage: "tag"),
        MoreItem(title: "Vendors", systemImage: "storefront"),
        MoreItem(title: "Groups", systemImage: "square.stack"),
    ])

    private static let help = MoreGroup(name: "Help", items: [
        MoreItem(title: "Guides", systemImage: "book"),
    ])
}

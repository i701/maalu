/// The destinations outside the four tabs, grouped like the web's sidebar.
enum MoreDestinations {
    static let groups = [money, planning, organise, help]

    private static let money = MoreGroup(id: "money", title: "Money", items: [
        MoreItem(id: "compare", title: "Compare", systemImage: "arrow.left.arrow.right"),
        MoreItem(id: "trends", title: "Trends", systemImage: "calendar"),
        MoreItem(id: "net-worth", title: "Net worth", systemImage: "chart.line.uptrend.xyaxis"),
        MoreItem(id: "places", title: "Places", systemImage: "map"),
    ])

    private static let planning = MoreGroup(id: "planning", title: "Planning", items: [
        MoreItem(id: "plan", title: "Month plan", systemImage: "checklist"),
        MoreItem(id: "pending", title: "Pending", systemImage: "checkmark.circle"),
        MoreItem(id: "subscriptions", title: "Subscriptions", systemImage: "repeat"),
        MoreItem(id: "goals", title: "Goals", systemImage: "target"),
    ])

    private static let organise = MoreGroup(id: "organise", title: "Organise", items: [
        MoreItem(id: "categories", title: "Categories", systemImage: "folder"),
        MoreItem(id: "tags", title: "Tags", systemImage: "tag"),
        MoreItem(id: "vendors", title: "Vendors", systemImage: "storefront"),
        MoreItem(id: "groups", title: "Groups", systemImage: "square.stack"),
        MoreItem(id: "templates", title: "Templates", systemImage: "bookmark"),
    ])

    private static let help = MoreGroup(id: "help", title: "Help", items: [
        MoreItem(id: "guides", title: "Guides", systemImage: "book"),
    ])
}

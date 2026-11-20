/// The destinations outside the four tabs, grouped like the web's sidebar.
enum MoreDestinations {
    static let groups = [money, planning, organise, help]

    private static let money = MoreGroup(id: "money", title: "Money", items: [
        MoreItem(id: "compare", title: "Compare", systemImage: "arrow.left.arrow.right", tint: .orange),
        MoreItem(id: "trends", title: "Trends", systemImage: "calendar", tint: .pink),
        MoreItem(id: "net-worth", title: "Net worth", systemImage: "chart.line.uptrend.xyaxis", tint: .green),
        MoreItem(id: "places", title: "Places", systemImage: "map", tint: .red),
    ])

    private static let planning = MoreGroup(id: "planning", title: "Planning", items: [
        MoreItem(id: "plan", title: "Month plan", systemImage: "checklist", tint: .brand),
        MoreItem(id: "pending", title: "Pending", systemImage: "checkmark.circle", tint: .teal),
        MoreItem(id: "subscriptions", title: "Subscriptions", systemImage: "repeat", tint: .purple),
        MoreItem(id: "goals", title: "Goals", systemImage: "target", tint: .orange),
    ])

    private static let organise = MoreGroup(id: "organise", title: "Organise", items: [
        MoreItem(id: "categories", title: "Categories", systemImage: "folder", tint: .indigo),
        MoreItem(id: "tags", title: "Tags", systemImage: "tag", tint: .pink),
        MoreItem(id: "vendors", title: "Vendors", systemImage: "storefront", tint: .orange),
        MoreItem(id: "groups", title: "Groups", systemImage: "square.stack", tint: .cyan),
        MoreItem(id: "templates", title: "Templates", systemImage: "bookmark", tint: .brand),
        MoreItem(id: "trash", title: "Trash", systemImage: "trash", tint: .gray),
    ])

    private static let help = MoreGroup(id: "help", title: "Help", items: [
        MoreItem(id: "settings", title: "Settings", systemImage: "gearshape", tint: .gray),
        MoreItem(id: "guides", title: "Guides", systemImage: "book", tint: .yellow),
    ])
}

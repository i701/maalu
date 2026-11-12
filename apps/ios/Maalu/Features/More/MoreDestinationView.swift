import SwiftUI

struct MoreDestinationView: View {
    let item: MoreItem

    var body: some View {
        switch item.id {
        case "plan": PlanView()
        case "subscriptions": SubscriptionsView()
        case "templates": TemplatesView()
        case "categories": CategoriesView()
        case "trash": TrashView()
        case "compare": CompareView()
        default: ComingSoonView(title: item.title, systemImage: item.systemImage)
        }
    }
}

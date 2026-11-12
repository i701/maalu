import SwiftUI

struct MoreDestinationView: View {
    let item: MoreItem

    var body: some View {
        switch item.id {
        case "plan": PlanView()
        default: ComingSoonView(title: item.title, systemImage: item.systemImage)
        }
    }
}

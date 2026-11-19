import SwiftUI

struct GroupsPlaceholder: View {
    let model: GroupsModel

    var body: some View {
        if model.groups.isEmpty {
            if model.isLoading {
                ProgressView()
            } else if model.errorMessage == nil {
                ContentUnavailableView("No groups yet", systemImage: "square.stack", description: Text("Bundle related transactions, like a trip over several accounts, to see what they add up to."))
            }
        } else if model.visible.isEmpty {
            ContentUnavailableView.search
        }
    }
}

import SwiftUI

struct GroupsView: View {
    @Environment(Session.self) private var session
    @State private var model = GroupsModel()
    @State private var isAdding = false

    var body: some View {
        @Bindable var model = model
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            ForEach(model.visible) { group in
                NavigationLink(value: GroupRoute.group(group.id)) {
                    GroupRow(group: group)
                }
            }
        }
        .overlay { GroupsPlaceholder(model: model) }
        .gradientHeader(.brand)
        .navigationTitle("Groups")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, prompt: "Search groups")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("New Group", systemImage: "plus") { isAdding = true }
            }
        }
        .sheet(isPresented: $isAdding) {
            GroupFormView(onSaved: reloadNow)
        }
        .navigationDestination(for: GroupRoute.self) { route in
            switch route {
            case .group(let id): GroupDetailView(id: id, onChange: reloadNow)
            }
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func reloadNow() {
        Task { await load() }
    }
}

import SwiftUI

struct MoreView: View {
    @Environment(Session.self) private var session

    var body: some View {
        NavigationStack {
            List {
                ForEach(MoreDestinations.groups) { group in
                    Section(String(localized: group.title)) {
                        ForEach(group.items) { item in
                            NavigationLink(value: item) {
                                Label { Text(item.title) } icon: { Image(systemName: item.systemImage) }
                            }
                        }
                    }
                }
                Section {
                    LabeledContent("Server", value: session.server ?? "")
                    Button("Sign out", role: .destructive, action: signOut)
                }
            }
            .navigationTitle("More")
            .navigationDestination(for: MoreItem.self) { item in
                MoreDestinationView(item: item)
            }
        }
    }

    private func signOut() {
        Task { await session.signOut() }
    }
}

import SwiftUI

/// Everything that is not one of the four tabs, plus the server you are signed in to and Sign out.
struct MoreView: View {
    @Environment(Session.self) private var session

    var body: some View {
        NavigationStack {
            List {
                ForEach(MoreDestinations.groups) { group in
                    Section(group.name) {
                        ForEach(group.items) { item in
                            NavigationLink {
                                ComingSoonView(title: item.title, systemImage: item.systemImage)
                            } label: {
                                Label(item.title, systemImage: item.systemImage)
                            }
                        }
                    }
                }
                Section {
                    LabeledContent("Server", value: session.server ?? "")
                    Button("Sign out", role: .destructive) { Task { await session.signOut() } }
                }
            }
            .navigationTitle("More")
        }
    }
}

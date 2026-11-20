import SwiftUI

struct MoreView: View {
    @Environment(Session.self) private var session

    private let columns = [GridItem(.flexible(), spacing: 12), GridItem(.flexible(), spacing: 12)]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 28) {
                    ForEach(MoreDestinations.groups) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            Text(group.title)
                                .font(.title3.weight(.semibold))
                                .padding(.horizontal, 4)
                            LazyVGrid(columns: columns, spacing: 12) {
                                ForEach(group.items) { item in
                                    NavigationLink(value: item) { MoreTile(item: item) }
                                        .buttonStyle(.plain)
                                }
                            }
                        }
                    }
                    MoreAccountCard(server: session.server ?? "", onSignOut: signOut)
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 24)
            }
            .background(Color(.systemGroupedBackground))
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

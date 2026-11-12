import SwiftUI

struct FilterTagsView: View {
    let tags: [NamedRef]
    @Binding var filter: TransactionFilter

    var body: some View {
        List {
            ForEach(tags, id: \.id) { tag in
                Button { toggle(tag.id) } label: {
                    HStack {
                        Text(tag.name)
                        Spacer()
                        if filter.tagIDs.contains(tag.id) { Image(systemName: "checkmark") }
                    }
                }
                .foregroundStyle(.primary)
            }
            if filter.tagIDs.count > 1 {
                Section {
                    Toggle("Must have all of them", isOn: $filter.matchesAllTags)
                }
            }
        }
        .navigationTitle("Tags")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if tags.isEmpty { ContentUnavailableView("No tags yet", systemImage: "tag") }
        }
    }

    private func toggle(_ id: String) {
        if filter.tagIDs.contains(id) {
            filter.tagIDs.remove(id)
        } else {
            filter.tagIDs.insert(id)
        }
    }
}

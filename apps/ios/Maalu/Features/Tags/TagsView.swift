import SwiftUI

struct TagsView: View {
    @Environment(Session.self) private var session
    @State private var model = TagsModel()
    @State private var naming: TagNaming?
    @State private var isNaming = false
    @State private var typedName = ""
    @State private var merging: TagRecord?
    @State private var deleting: TagRecord?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        @Bindable var model = model
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.visible) { tag in
                    Button { startNaming(.rename(tag)) } label: {
                        TagRow(tag: tag)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Renames the tag")
                    .swipeActions(edge: .trailing) {
                        Button("Delete", systemImage: "trash", role: .destructive) {
                            deleting = tag
                            isConfirmingDelete = true
                        }
                        Button("Merge", systemImage: "arrow.triangle.merge") { merging = tag }
                    }
                }
            } footer: {
                if !model.tags.isEmpty {
                    Text("Tap a tag to rename it; its colour is picked for you.")
                }
            }
        }
        .overlay { TagsPlaceholder(model: model) }
        .navigationTitle("Tags")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, prompt: "Search tags")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("Add Tag", systemImage: "plus") { startNaming(.add) }
            }
        }
        .alert(naming?.tag == nil ? "New Tag" : "Rename Tag", isPresented: $isNaming, presenting: naming) { naming in
            TextField("Name", text: $typedName)
            Button("Save") { save(naming) }
            Button("Cancel", role: .cancel) {}
        } message: { naming in
            if naming.tag != nil {
                Text("Every transaction and template with it follows.")
            }
        }
        .sheet(item: $merging) { tag in
            MergeSheet(
                targets: model.mergeTargets(for: tag),
                name: \.name,
                question: "Merge this tag?",
                consequence: { "Every transaction and template with \(tag.name) gets \($0.name) instead. \(tag.name) is then deleted." },
                onMerge: { await merge(tag, into: $0) }
            )
        }
        .confirmationDialog("Delete this tag?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: deleteSelected)
        } message: {
            Text(deleting.map { "\($0.name) comes off every transaction and template. Nothing else changes." } ?? "")
        }
        .alert("Something went wrong", item: $errorMessage) { _ in
        } message: { message in
            Text(message)
        }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func startNaming(_ naming: TagNaming) {
        typedName = naming.tag?.name ?? ""
        self.naming = naming
        isNaming = true
    }

    private func save(_ naming: TagNaming) {
        let name = typedName
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.save(name: name, renaming: naming.tag, using: api)
        }
    }

    private func merge(_ tag: TagRecord, into target: TagRecord) async -> String? {
        guard let api = session.api else { return String(localized: "Something went wrong.") }
        return await model.merge(tag, into: target, using: api)
    }

    private func deleteSelected() {
        guard let tag = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.delete(tag, using: api)
        }
    }
}

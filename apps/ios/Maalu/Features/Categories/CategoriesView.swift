import SwiftUI

struct CategoriesView: View {
    @Environment(Session.self) private var session
    @State private var model = CategoriesModel()
    @State private var sheet: CategorySheet?
    @State private var merging: Category?
    @State private var deleting: Category?
    @State private var isConfirmingDelete = false
    @State private var isSorting = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.visible) { category in
                    Button {
                        sheet = .edit(category)
                    } label: {
                        CategoryRow(category: category)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .swipeActions(edge: .trailing) {
                        if !category.isSalary {
                            Button("Delete", systemImage: "trash", role: .destructive) {
                                deleting = category
                                isConfirmingDelete = true
                            }
                            Button("Merge", systemImage: "arrow.triangle.merge") { merging = category }
                        }
                    }
                }
            }
        }
        .overlay { CategoriesPlaceholder(model: model) }
        .navigationTitle("Categories")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, prompt: "Search categories")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu("Options", systemImage: "ellipsis.circle") {
                    Button("Add Category", systemImage: "plus") { sheet = .add }
                    Button("Needs and wants", systemImage: "tune") { isSorting = true }
                }
            }
        }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .add: CategoryFormView(onSaved: reloadNow)
            case .edit(let category): CategoryFormView(editing: category, onSaved: reloadNow)
            }
        }
        .sheet(item: $merging) { category in
            MergeIntoSheet(category: category, targets: CategoryLogic.mergeTargets(from: model.categories, for: category)) { target in
                await merge(category, into: target)
            }
        }
        .sheet(isPresented: $isSorting) {
            SortKindsSheet(categories: model.categories, onSaved: reloadNow)
        }
        .confirmationDialog("Delete this category?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete", role: .destructive, action: deleteSelected)
        } message: {
            Text(deleting.map { "Every transaction, item and subscription in \($0.name) loses its category." } ?? "")
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

    private func reloadNow() {
        Task { await load() }
    }

    private func merge(_ category: Category, into target: Category) async -> String? {
        guard let api = session.api else { return "Something went wrong." }
        return await model.merge(category, into: target, using: api)
    }

    private func deleteSelected() {
        guard let category = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.delete(category, using: api)
        }
    }
}

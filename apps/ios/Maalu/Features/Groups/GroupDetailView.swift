import SwiftUI

struct GroupDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: GroupDetailModel
    @State private var isEditing = false
    @State private var isAdding = false
    @State private var isConfirmingDelete = false
    private let onChange: () -> Void

    init(id: String, onChange: @escaping () -> Void) {
        _model = State(initialValue: GroupDetailModel(id: id))
        self.onChange = onChange
    }

    var body: some View {
        @Bindable var model = model
        List {
            if let detail = model.detail {
                GroupSummarySection(detail: detail)
                Section {
                    ForEach(detail.transactions) { transaction in
                        TransactionRow(transaction: transaction)
                            .swipeActions {
                                Button("Take Out", systemImage: "minus.circle", role: .destructive) { takeOut(transaction) }
                            }
                    }
                    if model.room > 0 {
                        Button("Add Transactions", systemImage: "plus") { isAdding = true }
                    }
                } header: {
                    Text("Transactions")
                } footer: {
                    Text("Swipe one to take it out. A group needs at least two, so taking out the last but one deletes it.")
                }
            }
        }
        .overlay { if model.isLoading && model.detail == nil { ProgressView() } }
        .navigationTitle(model.detail?.name ?? "")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if model.detail != nil {
                ToolbarItem(placement: .primaryAction) {
                    Button("Edit", systemImage: "pencil") { isEditing = true }
                }
                ToolbarItem {
                    Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
                        .confirmationDialog("Delete this group?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                            Button("Delete", role: .destructive, action: delete)
                        } message: {
                            Text("Its transactions are kept and just stop being grouped.")
                        }
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            if let detail = model.detail {
                GroupFormView(editing: detail.summary, onSaved: changed)
            }
        }
        .sheet(isPresented: $isAdding) {
            GroupAddSheet(groupID: model.id, room: model.room, onAdd: add)
        }
        .alert("Something went wrong", item: $model.errorMessage) { _ in
        } message: { message in
            Text(message)
        }
        .onChange(of: model.isGone) { closeIfGone() }
        .refreshable { await load() }
        .task { await load() }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func changed() {
        onChange()
        Task { await load() }
    }

    private func add(_ ids: Set<String>) {
        Task {
            guard let api = session.api else { return }
            await model.add(ids, using: api)
            onChange()
        }
    }

    private func takeOut(_ transaction: Transaction) {
        Task {
            guard let api = session.api else { return }
            await model.takeOut(transaction, using: api)
            onChange()
        }
    }

    private func delete() {
        Task {
            guard let api = session.api else { return }
            await model.delete(using: api)
        }
    }

    private func closeIfGone() {
        guard model.isGone else { return }
        onChange()
        dismiss()
    }
}

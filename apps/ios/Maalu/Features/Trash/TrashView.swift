import SwiftUI

struct TrashView: View {
    @Environment(Session.self) private var session
    @State private var model = TrashModel()
    @State private var deleting: Transaction?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            ForEach(model.transactions) { transaction in
                TrashRow(transaction: transaction)
                    .swipeActions(edge: .leading) {
                        Button("Restore", systemImage: "arrow.uturn.backward") { restore(transaction) }
                    }
                    .swipeActions(edge: .trailing) {
                        Button("Delete Forever", systemImage: "trash", role: .destructive) {
                            deleting = transaction
                            isConfirmingDelete = true
                        }
                    }
            }
            if model.hasMore {
                if model.errorMessage == nil {
                    ProgressView()
                        .frame(maxWidth: .infinity)
                        .task { await loadMore() }
                } else {
                    Button("Try again", action: retryMore)
                }
            }
        }
        .overlay { TrashPlaceholder(model: model) }
        .navigationTitle("Trash")
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog("Delete this transaction for good?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
            Button("Delete Forever", role: .destructive, action: deleteSelected)
        } message: {
            Text("It cannot be restored.")
        }
        .alert("Something went wrong", item: $errorMessage) { _ in
        } message: { message in
            Text(message)
        }
        .refreshable { await reload() }
        .task { await reload() }
    }

    private func reload() async {
        guard let api = session.api else { return }
        await model.reload(using: api)
    }

    private func loadMore() async {
        guard let api = session.api else { return }
        await model.loadMore(using: api)
    }

    private func restore(_ transaction: Transaction) {
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.restore(transaction, using: api)
        }
    }

    private func deleteSelected() {
        guard let transaction = deleting else { return }
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.deleteForever(transaction, using: api)
        }
    }

    private func retryMore() {
        Task { await loadMore() }
    }
}

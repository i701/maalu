import SwiftUI

struct SubscriptionDetailView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    let listModel: SubscriptionsModel
    let id: String
    @State private var model = SubscriptionDetailModel()
    @State private var sheet: SubscriptionSheet?
    @State private var isConfirmingDelete = false
    @State private var errorMessage: String?

    var body: some View {
        if let subscription = listModel.subscription(id: id) {
            List {
                Section {
                    SubscriptionAmountText(amount: subscription.amount, currency: subscription.currency, varies: subscription.amountVaries)
                        .font(.largeTitle)
                        .bold()
                }
                SubscriptionFactsSection(subscription: subscription, baseCurrency: listModel.summary?.currency)
            }
            .navigationTitle(subscription.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbar(for: subscription) }
            .confirmationDialog("Delete this subscription?", isPresented: $isConfirmingDelete, titleVisibility: .visible) {
                Button("Delete", role: .destructive) { delete(subscription) }
            } message: {
                Text("Its transactions are kept and lose the link. A planned payment stays in your planned list until you delete it there.")
            }
            .sheet(item: $sheet) { sheet in
                if case .edit(let subscription) = sheet {
                    SubscriptionFormView(editing: subscription, onSaved: reload)
                }
            }
            .alert("Something went wrong", item: $errorMessage) { _ in
            } message: { message in
                Text(message)
            }
        } else {
            ContentUnavailableView("Subscription not found", systemImage: "questionmark.circle")
        }
    }

    @ToolbarContentBuilder
    private func toolbar(for subscription: Subscription) -> some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Menu("Actions", systemImage: "ellipsis.circle") {
                Button("Edit", systemImage: "pencil") { sheet = .edit(subscription) }
                if subscription.canPause {
                    Button("Pause", systemImage: "pause") { change(.paused, of: subscription) }
                }
                if subscription.canResume {
                    Button("Resume", systemImage: "play") { change(.active, of: subscription) }
                }
                Button("Delete", systemImage: "trash", role: .destructive) { isConfirmingDelete = true }
            }
        }
    }

    private func reload() {
        Task {
            guard let api = session.api else { return }
            await listModel.load(using: api)
        }
    }

    private func change(_ status: SubscriptionStatus, of subscription: Subscription) {
        Task {
            guard let api = session.api else { return }
            if let message = await model.setStatus(status, of: subscription, using: api) {
                errorMessage = message
            } else {
                await listModel.load(using: api)
            }
        }
    }

    private func delete(_ subscription: Subscription) {
        Task {
            guard let api = session.api else { return }
            if let message = await model.delete(subscription, using: api) {
                errorMessage = message
            } else {
                await listModel.load(using: api)
                dismiss()
            }
        }
    }
}

import SwiftUI

struct SubscriptionsView: View {
    @Environment(Session.self) private var session
    @State private var model = SubscriptionsModel()
    @State private var sheet: SubscriptionSheet?
    @State private var errorMessage: String?

    var body: some View {
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if let status = model.status {
                SubscriptionFilterSection(status: status) { model.status = nil }
            }
            if let summary = model.summary {
                SubscriptionSummarySection(summary: summary)
            }
            if !model.candidates.isEmpty {
                SuggestionsSection(candidates: model.candidates, onAdd: { sheet = .accept($0) }, onDismiss: dismiss)
            }
            Section {
                ForEach(model.visible) { subscription in
                    NavigationLink(value: SubscriptionRoute(id: subscription.id)) {
                        SubscriptionRow(subscription: subscription)
                    }
                }
            }
        }
        .overlay { SubscriptionsPlaceholder(model: model) }
        .navigationTitle("Subscriptions")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, prompt: "Search subscriptions")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu("Options", systemImage: model.status == nil ? "ellipsis.circle" : "ellipsis.circle.fill") {
                    Button("Add Subscription", systemImage: "plus") { sheet = .add }
                    Picker("Status", selection: $model.status) {
                        Text("All").tag(SubscriptionStatus?.none)
                        ForEach(SubscriptionStatus.allCases) { status in
                            Text(status.title).tag(Optional(status))
                        }
                    }
                }
            }
        }
        .navigationDestination(for: SubscriptionRoute.self) { route in
            SubscriptionDetailView(listModel: model, id: route.id)
        }
        .sheet(item: $sheet) { sheet in
            switch sheet {
            case .add: SubscriptionFormView(onSaved: reloadNow)
            case .edit(let subscription): SubscriptionFormView(editing: subscription, onSaved: reloadNow)
            case .accept(let candidate): AcceptSuggestionView(candidate: candidate, onSaved: reloadNow)
            }
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

    private func dismiss(_ candidate: SubscriptionCandidate) {
        Task {
            guard let api = session.api else { return }
            errorMessage = await model.dismiss(candidate, using: api)
        }
    }
}

import SwiftUI

/// Salaries that arrived and are waiting for their split to be approved.
struct PendingView: View {
    @Environment(Session.self) private var session
    @State private var model = PendingModel()
    @State private var reviewing: SalarySplitTask?
    @State private var message: String?

    var body: some View {
        List {
            if let error = model.errorMessage {
                Text(error).foregroundStyle(.red)
            }
            ForEach(model.tasks) { task in
                PendingTaskSection(
                    task: task,
                    isBusy: model.busyID == task.id,
                    onApprove: { approve(task) },
                    onReview: { reviewing = task },
                    onDismiss: { dismiss(task) }
                )
            }
        }
        .overlay {
            if model.isLoading {
                ProgressView()
            } else if model.tasks.isEmpty && model.errorMessage == nil {
                ContentUnavailableView("Nothing is waiting", systemImage: "checkmark.circle", description: Text("When a salary arrives and you have split rules, its split waits here for you to approve."))
            }
        }
        .gradientHeader(.accentOrange)
        .navigationTitle("Pending")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task { await load() }
        .sheet(item: $reviewing) { task in
            SalarySplitView(transactionID: task.plan.salaryId) {
                Task { await load() }
            }
        }
        .alert("Pending", isPresented: Binding(get: { message != nil }, set: { if !$0 { message = nil } })) {
        } message: {
            Text(message ?? "")
        }
    }

    private func approve(_ task: SalarySplitTask) {
        Task {
            guard let api = session.api else { return }
            message = await model.approve(task, using: api)
        }
    }

    private func dismiss(_ task: SalarySplitTask) {
        Task {
            guard let api = session.api else { return }
            message = await model.dismiss(task, using: api)
        }
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}

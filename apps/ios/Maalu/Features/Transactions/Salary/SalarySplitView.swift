import SwiftUI

/// Splits a salary between accounts and goals by the rules in Settings. It opens with the proposal, every line filled in and editable,
/// and nothing is made until you confirm. Once the whole salary is split it shows what was made and offers to undo it.
struct SalarySplitView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: SalarySplitModel
    @State private var isConfirmingUndo = false
    /// Runs after anything changed, with a line to show.
    let onChanged: () -> Void

    init(transactionID: String, onChanged: @escaping () -> Void) {
        _model = State(initialValue: SalarySplitModel(transactionID: transactionID))
        self.onChanged = onChanged
    }

    var body: some View {
        NavigationStack {
            List {
                if let plan = model.plan {
                    SalarySplitContent(model: model, plan: plan, isConfirmingUndo: $isConfirmingUndo)
                } else if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .overlay { if model.plan == nil && model.errorMessage == nil { ProgressView() } }
            .saving(model.isSaving)
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(isFinished ? "Done" : "Cancel") { close() }.disabled(model.isSaving)
                }
                if let plan = model.plan, !plan.complete, !model.lines.isEmpty {
                    ToolbarItem(placement: .confirmationAction) {
                        SaveButton("Make", isSaving: model.isSaving, isEnabled: model.problem == nil, action: apply)
                    }
                }
            }
            .task { await load() }
            .confirmationDialog("Undo the split?", isPresented: $isConfirmingUndo, titleVisibility: .visible) {
                Button("Undo it", role: .destructive, action: undo)
                Button("Keep it", role: .cancel) {}
            } message: {
                Text("The transfers made from this salary go to the trash and the amounts set aside for goals are removed.")
            }
        }
    }

    private var isFinished: Bool { model.plan?.complete == true || model.lines.isEmpty }

    private var title: LocalizedStringResource {
        guard let plan = model.plan else { return "Split this salary" }
        if plan.complete { return "This salary was split" }
        return plan.applied ? "Finish splitting this salary" : "Split this salary"
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }

    private func apply() {
        Task {
            guard let api = session.api, await model.apply(using: api) != nil else { return }
            onChanged()
            dismiss()
        }
    }

    private func undo() {
        Task {
            guard let api = session.api, await model.undo(using: api) else { return }
            onChanged()
            dismiss()
        }
    }

    private func close() {
        onChanged()
        dismiss()
    }
}

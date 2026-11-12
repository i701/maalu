import SwiftUI

struct AcceptSuggestionView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: AcceptSuggestionModel
    private let onSaved: () -> Void

    init(candidate: SubscriptionCandidate, onSaved: @escaping () -> Void) {
        _model = State(initialValue: AcceptSuggestionModel(candidate))
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $model.draft.name)
                    LabeledContent("Amount in \(model.candidate.currency)") {
                        DecimalField("0.00", value: $model.draft.amount).multilineTextAlignment(.trailing)
                    }
                    LabeledContent("Every") {
                        OptionalIntField("1", value: $model.draft.count).multilineTextAlignment(.trailing)
                    }
                    Picker("Unit", selection: $model.draft.unit) {
                        ForEach(IntervalUnit.allCases) { unit in
                            Text(unit.title).tag(unit)
                        }
                    }
                    .pickerStyle(.segmented)
                } footer: {
                    Text("Every payment of this pattern is linked to it, so its history and next payment are right from the start.")
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .navigationTitle("Add \(model.candidate.vendorName)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add", action: accept).disabled(!model.canSave)
                }
            }
        }
    }

    private func accept() {
        Task {
            guard let api = session.api, await model.accept(using: api) else { return }
            onSaved()
            dismiss()
        }
    }
}

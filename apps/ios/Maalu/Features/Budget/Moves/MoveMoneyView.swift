import SwiftUI

struct MoveMoneyView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var model: MoveMoneyModel
    private let line: BudgetLine
    private let currency: String
    private let period: Date
    private let onSaved: () -> Void

    init(line: BudgetLine, budget: Budget, period: Date, onSaved: @escaping () -> Void) {
        _model = State(initialValue: MoveMoneyModel(lineID: line.id, budget: budget))
        self.line = line
        currency = budget.currency
        self.period = period
        self.onSaved = onSaved
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Picker("From", selection: $model.draft.sourceID) {
                        Text("Nowhere: just add to this limit").tag(String?.none)
                        ForEach(model.sources) { source in
                            Text("\(source.line.name) · \(source.isUsable ? String(localized: "\(MoneyFormat.string(source.left, currency: currency)) left") : String(localized: "nothing left"))")
                                .tag(Optional(source.id))
                                .selectionDisabled(!source.isUsable)
                        }
                    }
                } footer: {
                    Text(model.source == nil
                         ? "Adds to this limit for this period only, without taking from another."
                         : "For this period only. Next period both limits are back to normal.")
                }
                Section {
                    DecimalField("Amount in \(currency)", value: $model.draft.amount)
                    TextField("Note (optional)", text: $model.draft.note, axis: .vertical)
                } footer: {
                    if let source = model.source {
                        Text("Up to \(MoneyFormat.string(source.left, currency: currency))")
                    }
                }
                if let message = model.errorMessage {
                    Text(message).foregroundStyle(.red)
                }
            }
            .navigationTitle("Move money to \(line.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Move", action: save).disabled(!model.canSave)
                }
            }
        }
    }

    private func save() {
        Task {
            guard let api = session.api, await model.save(on: period, using: api) else { return }
            onSaved()
            dismiss()
        }
    }
}

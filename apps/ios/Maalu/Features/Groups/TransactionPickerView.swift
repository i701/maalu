import SwiftUI

/// Tick the transactions for a group, from the newest 50 or a search.
struct TransactionPickerView: View {
    @Environment(Session.self) private var session
    @State private var model: TransactionPickerModel
    @Binding var selection: Set<String>
    /// How many more can be ticked.
    let room: Int

    init(selection: Binding<Set<String>>, groupID: String? = nil, room: Int = TransactionGroup.most) {
        _model = State(initialValue: TransactionPickerModel(groupID: groupID))
        _selection = selection
        self.room = room
    }

    var body: some View {
        @Bindable var model = model
        List {
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            Section {
                ForEach(model.transactions) { transaction in
                    let refusal = TransactionPickerModel.refusal(of: transaction, addingTo: model.groupID)
                    let isChosen = selection.contains(transaction.id)
                    Button { toggle(transaction.id) } label: {
                        HStack {
                            VStack(alignment: .leading) {
                                TransactionRow(transaction: transaction)
                                if let refusal {
                                    Text(refusal).font(.footnote).foregroundStyle(.secondary)
                                }
                            }
                            Image(systemName: isChosen ? "checkmark.circle.fill" : "circle")
                                .foregroundStyle(isChosen ? Color.accentColor : Color.secondary)
                                .accessibilityHidden(true)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .disabled(refusal != nil || (!isChosen && selection.count >= room))
                    .accessibilityAddTraits(isChosen ? .isSelected : [])
                }
            } footer: {
                Text("^[\(selection.count) transaction](inflect: true) chosen, up to \(room).")
            }
        }
        .overlay { if model.isLoading && model.transactions.isEmpty { ProgressView() } }
        .navigationTitle("Transactions")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $model.search, placement: .navigationBarDrawer(displayMode: .always))
        .task(id: model.search) { await load() }
    }

    private func load() async {
        // a short pause, so a search is sent once typing stops rather than on every letter
        if !model.search.isEmpty { try? await Task.sleep(for: .milliseconds(300)) }
        guard !Task.isCancelled, let api = session.api else { return }
        await model.load(using: api)
    }

    private func toggle(_ id: String) {
        if selection.contains(id) {
            selection.remove(id)
        } else {
            selection.insert(id)
        }
    }
}

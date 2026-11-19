import SwiftUI

/// Picks more transactions for a group and adds them.
struct GroupAddSheet: View {
    @Environment(\.dismiss) private var dismiss
    let groupID: String
    let room: Int
    let onAdd: (Set<String>) -> Void
    @State private var selection: Set<String> = []

    var body: some View {
        NavigationStack {
            TransactionPickerView(selection: $selection, groupID: groupID, room: room)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel", role: .cancel) { dismiss() }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Add", action: add).disabled(selection.isEmpty)
                    }
                }
        }
    }

    private func add() {
        onAdd(selection)
        dismiss()
    }
}

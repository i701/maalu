import SwiftUI

/// What can be done with the picked rows: Edit, Select all (which reaches past what is loaded) and Delete. It is in the top bar so the
/// bottom stays free for the search field, which is how the rows to pick are found.
struct TransactionSelectionMenu: View {
    let selection: TransactionSelection
    let onEdit: () -> Void
    let onDelete: () -> Void
    let onSelectAll: () -> Void

    var body: some View {
        Menu("Actions", systemImage: "ellipsis.circle") {
            Button("Select all", systemImage: "checkmark.circle", action: onSelectAll)
            Button("Edit", systemImage: "pencil", action: onEdit)
                .disabled(selection.count == 0)
            Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
                .disabled(selection.count == 0)
        }
        .disabled(selection.isBusy)
    }
}

import SwiftUI

/// What can be done with a transaction, as labelled rows at the end of its detail sheet.
struct TransactionActionsSection: View {
    let transaction: Transaction
    let onMarkPaid: () -> Void
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void

    var body: some View {
        Section {
            if transaction.planned {
                Button(markTitle, systemImage: "checkmark.circle", action: onMarkPaid)
            }
            if transaction.canEdit {
                Button("Edit", systemImage: "pencil", action: onEdit)
                Button("Duplicate", systemImage: "plus.square.on.square", action: onDuplicate)
            }
            Button("Delete", systemImage: "trash", role: .destructive, action: onDelete)
        }
    }

    private var markTitle: LocalizedStringResource {
        switch transaction.type {
        case .transfer: "Mark as done"
        case .income: "Mark as received"
        case .expense: "Mark as paid"
        }
    }
}

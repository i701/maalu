import SwiftUI

/// Mark as paid, Edit, Duplicate and Delete as pills; the rest of what can be done waits in the list below.
struct TransactionQuickActions: View {
    let transaction: Transaction
    let onMarkPaid: () -> Void
    let onEdit: () -> Void
    let onDuplicate: () -> Void
    let onDelete: () -> Void

    var body: some View {
        if transaction.planned {
            TransactionActionPill(title: markTitle, tint: .success, action: onMarkPaid)
        }
        if transaction.canEdit {
            TransactionActionPill(title: "Edit", tint: .brand, action: onEdit)
            TransactionActionPill(title: "Duplicate", tint: .brand, action: onDuplicate)
        }
        TransactionActionPill(title: "Delete", tint: .red, action: onDelete)
    }

    private var markTitle: LocalizedStringResource {
        switch transaction.type {
        case .transfer: "Mark as done"
        case .income: "Mark as received"
        case .expense: "Mark as paid"
        }
    }
}

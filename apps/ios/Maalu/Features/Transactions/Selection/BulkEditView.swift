import SwiftUI

/// Change the same things on every picked transaction: a category, a vendor, the way of paying, tags to add and tags to remove.
/// Leave something alone to leave it as it is; what does not fit a transaction (a category on a transfer) is skipped and reported.
struct BulkEditView: View {
    @Environment(Session.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var edit = BulkEdit()
    @State private var options = BulkEditOptions()
    let selection: TransactionSelection
    /// Runs after the change, with the line to show.
    let onDone: (String) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    NavigationLink(value: BulkEditRoute.category) {
                        LabeledContent("Set category", value: edit.category.isEmpty ? String(localized: "Leave as it is") : edit.category)
                    }
                    NavigationLink(value: BulkEditRoute.vendor) {
                        LabeledContent("Set vendor", value: edit.vendor.isEmpty ? String(localized: "Leave as it is") : edit.vendor)
                    }
                    Picker("Way of paying", selection: $edit.method) {
                        Text("Leave as it is").tag(PaymentMethod?.none)
                        ForEach(PaymentMethod.allCases) { Text($0.title).tag(PaymentMethod?.some($0)) }
                    }
                } footer: {
                    Text("Only what you set changes. Anything that does not fit a transaction, like a category on a transfer, is skipped.")
                }
                Section {
                    NavigationLink(value: BulkEditRoute.addTags) {
                        LabeledContent("Add tags", value: edit.addTags.isEmpty ? String(localized: "None") : edit.addTags.formatted(.list(type: .and, width: .narrow)))
                    }
                    NavigationLink(value: BulkEditRoute.removeTags) {
                        LabeledContent("Remove tags", value: edit.removeTags.isEmpty ? String(localized: "None") : edit.removeTags.formatted(.list(type: .and, width: .narrow)))
                    }
                }
            }
            .saving(selection.isBusy)
            .navigationTitle("Edit \(TransactionSelection.transactionCount(selection.count))")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(selection.isBusy)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton("Apply", isSaving: selection.isBusy, isEnabled: !edit.isEmpty, action: apply)
                }
            }
            .navigationDestination(for: BulkEditRoute.self) { route in
                switch route {
                case .category: NamePickerView(title: "Category", options: options.categories, allowsNone: true, selection: $edit.category)
                case .vendor: NamePickerView(title: "Vendor", options: options.vendors, allowsNone: true, selection: $edit.vendor)
                case .addTags: TagsPickerView(options: options.tags, selection: $edit.addTags)
                case .removeTags: TagsPickerView(options: options.tags, selection: $edit.removeTags)
                }
            }
            .task {
                guard let api = session.api else { return }
                await options.load(using: api)
            }
        }
    }

    private func apply() {
        Task {
            guard let api = session.api else { return }
            let message = await selection.apply(edit, using: api)
            onDone(message)
            dismiss()
        }
    }
}

import SwiftUI

/// Drag the dashboard's cards into the order you like. It is saved once, on Done; Reset goes back to the default order.
struct DashboardArrangeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var order: [DashboardSection]
    @State private var isSaving = false
    @State private var errorMessage: String?
    /// Saves the order, or the default one for nil; returns a message when the server refused.
    let onSave: ([DashboardSection]?) async -> String?
    private let defaults: [DashboardSection]

    /// `sections` are the cards on show now, in their current order; `defaults` the same cards in the default one.
    init(sections: [DashboardSection], defaults: [DashboardSection], onSave: @escaping ([DashboardSection]?) async -> String?) {
        _order = State(initialValue: sections)
        self.defaults = defaults
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(order) { Text($0.title) }
                        .onMove { order.move(fromOffsets: $0, toOffset: $1) }
                } footer: {
                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    } else {
                        Text("Drag the handles to put the cards in the order you like.")
                    }
                }
                Section {
                    Button("Reset to the default order", role: .destructive) { order = defaults }
                        .disabled(order == defaults)
                }
            }
            .environment(\.editMode, .constant(.active))
            .saving(isSaving)
            .navigationTitle("Arrange the dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }.disabled(isSaving)
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton("Done", isSaving: isSaving, action: save)
                }
            }
        }
    }

    private func save() {
        Task {
            isSaving = true
            // the default order is saved as no order, so a card added later lands where it belongs
            errorMessage = await onSave(order == defaults ? nil : order)
            isSaving = false
            if errorMessage == nil { dismiss() }
        }
    }
}

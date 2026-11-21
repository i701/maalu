import SwiftUI

/// Drag the dashboard's cards into the order you like and switch off the ones you do not want. It is saved once, on Done; Reset goes back to the default order with every card on.
struct DashboardArrangeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var order: [DashboardSection]
    @State private var hidden: Set<DashboardSection>
    @State private var isSaving = false
    @State private var errorMessage: String?
    /// Saves the order (nil for the default one) and the cards switched off; returns a message when the server refused.
    let onSave: ([DashboardSection]?, Set<DashboardSection>) async -> String?
    private let defaults: [DashboardSection]

    /// `sections` are the cards that have something to show, in their current order; `defaults` the same cards in the default one.
    init(
        sections: [DashboardSection],
        defaults: [DashboardSection],
        hidden: Set<DashboardSection>,
        onSave: @escaping ([DashboardSection]?, Set<DashboardSection>) async -> String?
    ) {
        _order = State(initialValue: sections)
        _hidden = State(initialValue: hidden)
        self.defaults = defaults
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(order) { section in
                        Toggle(isOn: isShown(section)) { Text(section.title) }
                    }
                    .onMove { order.move(fromOffsets: $0, toOffset: $1) }
                } footer: {
                    if let errorMessage {
                        Text(errorMessage).foregroundStyle(.red)
                    } else {
                        Text("Drag the handles to put the cards in the order you like, and switch off the ones you do not want. Which cards are off is kept on this device.")
                    }
                }
                Section {
                    Button("Reset order and show every card", role: .destructive, action: reset)
                        .disabled(order == defaults && hidden.isEmpty)
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

    private func isShown(_ section: DashboardSection) -> Binding<Bool> {
        Binding {
            !hidden.contains(section)
        } set: { isOn in
            if isOn { hidden.remove(section) } else { hidden.insert(section) }
        }
    }

    private func reset() {
        order = defaults
        hidden = []
    }

    private func save() {
        Task {
            isSaving = true
            // the default order is saved as no order, so a card added later lands where it belongs
            errorMessage = await onSave(order == defaults ? nil : order, hidden)
            isSaving = false
            if errorMessage == nil { dismiss() }
        }
    }
}

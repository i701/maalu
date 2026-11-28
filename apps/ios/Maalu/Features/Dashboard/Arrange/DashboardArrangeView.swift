import SwiftUI

/// Drag the dashboard's cards into the order you like and switch off the ones you do not want. It is saved once, on Done; Reset goes back to the default order with every card on.
struct DashboardArrangeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var order: [DashboardSection]
    @State private var hidden: Set<DashboardSection>
    /// Saves the order (nil for the default one) and the cards switched off.
    let onSave: @MainActor ([DashboardSection]?, Set<DashboardSection>) -> Void
    private let defaults: [DashboardSection]

    /// `sections` are the cards that have something to show, in their current order; `defaults` the same cards in the default one.
    init(
        sections: [DashboardSection],
        defaults: [DashboardSection],
        hidden: Set<DashboardSection>,
        onSave: @escaping @MainActor ([DashboardSection]?, Set<DashboardSection>) -> Void
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
                    Text("Drag the handles to put the cards in the order you like, and switch off the ones you do not want. Both are kept on this device.")
                }
                Section {
                    Button("Reset order and show every card", role: .destructive, action: reset)
                        .disabled(order == defaults && hidden.isEmpty)
                }
            }
            .environment(\.editMode, .constant(.active))
            .navigationTitle("Arrange the dashboard")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel", role: .cancel) { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    SaveButton("Done", isSaving: false, action: save)
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
        // the default order is saved as no order, so a card added later lands where it belongs
        onSave(order == defaults ? nil : order, hidden)
        dismiss()
    }
}

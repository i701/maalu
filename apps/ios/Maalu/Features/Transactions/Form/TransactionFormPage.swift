import SwiftUI

/// The form for one transaction type: its own Form, laid out for that type whatever the draft's type is right now, so the neighbouring page can be seen while swiping.
struct TransactionFormPage: View {
    @Bindable var model: TransactionFormModel
    let type: TransactionType
    /// The home indicator's height, added to the room left under the last row for the Save button.
    let bottomInset: CGFloat
    let onSaveAndAddAnother: () -> Void
    @FocusState private var isAmountFocused: Bool

    var body: some View {
        Form {
            TransactionTypeSection(model: model, isAmountFocused: $isAmountFocused)
            TransactionAccountSection(model: model)
            if type != .transfer {
                TransactionDetailsSection(model: model)
                TransactionItemsSection(model: model)
            }
            TransactionDateSection(model: model)
            TransactionLocationSection(location: $model.draft.location)
            if !model.isEditing {
                TransactionAttachmentsSection(model: model)
            }
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if !model.isEditing {
                Section {
                    Button("Save and Add Another", action: onSaveAndAddAnother).disabled(!model.canSave)
                } footer: {
                    if model.savedCount > 0 {
                        Text("Saved \(model.savedCount). Enter the next one.")
                    }
                }
            }
        }
        .scrollDismissesKeyboard(.automatic)
        // room above and below, where the edge blur and the Save button sit over the scrolling form
        .contentMargins(.top, 16, for: .scrollContent)
        .contentMargins(.bottom, 84 + bottomInset, for: .scrollContent)
        .environment(\.formType, type)
    }
}

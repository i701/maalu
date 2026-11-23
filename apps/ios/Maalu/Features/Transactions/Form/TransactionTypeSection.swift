import SwiftUI

struct TransactionTypeSection: View {
    @Bindable var model: TransactionFormModel
    var isAmountFocused: FocusState<Bool>.Binding
    @Environment(\.formType) private var formType

    private var type: TransactionType { formType ?? model.draft.type }

    var body: some View {
        Section {
            if type == .transfer {
                EmptyView()
            } else if model.draft.hasItems {
                AmountRow { Text("Amount") } amount: { MoneyText(model.draft.itemsTotal, currency: model.currency) }
                    .foregroundStyle(.secondary)
            } else {
                BigAmountField(value: $model.draft.amount, currency: model.currency, isFocused: isAmountFocused)
            }
        }
    }
}

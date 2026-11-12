import SwiftUI

struct TransactionTypeSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            Picker("Type", selection: $model.draft.type) {
                ForEach(TransactionType.allCases) { type in
                    Text(type.title).tag(type)
                }
            }
            .pickerStyle(.segmented)
            TextField("Amount", value: $model.draft.amount, format: .number.grouping(.never))
                .keyboardType(.decimalPad)
        }
    }
}

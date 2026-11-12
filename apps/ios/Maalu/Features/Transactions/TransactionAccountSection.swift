import SwiftUI

struct TransactionAccountSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            Picker(model.draft.type == .transfer ? "From" : "Account", selection: $model.draft.accountID) {
                Text("Choose").tag(String?.none)
                ForEach(model.accounts) { account in
                    Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                }
            }
            .onChange(of: model.draft.accountID) { model.accountChanged() }

            if model.draft.type == .transfer {
                Picker("To", selection: $model.draft.toAccountID) {
                    Text("Choose").tag(String?.none)
                    ForEach(model.accounts) { account in
                        Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                    }
                }
                if model.needsToAmount, let toAccount = model.toAccount {
                    TextField("Amount in \(toAccount.currency)", value: $model.draft.toAmount, format: .number.grouping(.never))
                        .keyboardType(.decimalPad)
                }
            }
            if model.needsRate {
                TextField("Exchange rate to \(model.baseCurrency)", value: $model.draft.rate, format: .number.grouping(.never))
                    .keyboardType(.decimalPad)
            }
        }
    }
}

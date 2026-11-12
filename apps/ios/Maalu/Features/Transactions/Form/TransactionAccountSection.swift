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
                    DecimalField("Amount in \(toAccount.currency)", value: $model.draft.toAmount)
                }
            }
            if model.needsRate {
                DecimalField("Exchange rate to \(model.baseCurrency)", value: $model.draft.rate)
            }
        }
    }
}

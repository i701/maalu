import SwiftUI

struct SubscriptionBasicsSection: View {
    @Bindable var model: SubscriptionFormModel

    var body: some View {
        Section {
            TextField("Name", text: $model.draft.name)
            LabeledContent("Amount") {
                DecimalField("0.00", value: $model.draft.amount).multilineTextAlignment(.trailing)
            }
            Toggle("The amount changes each time", isOn: $model.draft.amountVaries)
            Picker("Pay from", selection: $model.draft.accountID) {
                Text("No account").tag(String?.none)
                ForEach(model.accounts) { account in
                    Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                }
            }
            .onChange(of: model.draft.accountID) { model.accountChanged() }
            if model.needsRate {
                LabeledContent("Rate to \(model.baseCurrency)") {
                    DecimalField("15.42", value: $model.draft.rate).multilineTextAlignment(.trailing)
                }
            }
        } footer: {
            if model.draft.amountVaries {
                Text("A utility or server bill: payments are estimates until you enter the real amount.")
            }
        }
    }
}

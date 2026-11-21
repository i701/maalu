import SwiftUI

struct TransactionAccountSection: View {
    @Bindable var model: TransactionFormModel
    @Environment(\.formType) private var formType

    private var type: TransactionType { formType ?? model.draft.type }

    var body: some View {
        if type == .transfer {
            Section {
                TransferSlabs(model: model)
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)
            }
        } else {
            fields
        }
    }

    private var fields: some View {
        Section {
            Picker("Account", selection: $model.draft.accountID) {
                Text("Choose").tag(String?.none)
                ForEach(model.accounts) { account in
                    Text("\(account.name) · \(account.currency)").tag(Optional(account.id))
                }
            }
            .onChange(of: model.draft.accountID) { model.accountChanged() }

            if model.needsRate {
                DecimalField("Exchange rate to \(model.baseCurrency)", value: $model.rate)
                if let note = model.rateNote {
                    Text(note).font(.footnote).foregroundStyle(.secondary)
                }
                if model.canUseMarketRate {
                    Button("Use the market rate") { model.useMarketRate() }.font(.footnote)
                }
            }
        }
    }
}

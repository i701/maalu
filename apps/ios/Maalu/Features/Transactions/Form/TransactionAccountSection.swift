import SwiftUI

struct TransactionAccountSection: View {
    @Bindable var model: TransactionFormModel
    @Environment(\.formType) private var formType
    @State private var isChoosing = false

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
            Button { isChoosing = true } label: {
                HStack(alignment: .top) {
                    Text("Account")
                    Spacer()
                    VStack(alignment: .trailing, spacing: 2) {
                        Text(model.account.map { "\($0.name) · \($0.currency)" } ?? String(localized: "Choose"))
                            .foregroundStyle(model.account == nil ? Color.secondary : Color.accentColor)
                        if let account = model.account {
                            Text(account.numberAndBalance)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    Image(systemName: "chevron.up.chevron.down")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .padding(.top, 3)
                }
                .contentShape(.rect)
            }
            .buttonStyle(.plain)
            .sheet(isPresented: $isChoosing) {
                AccountChoiceSheet(accounts: model.accounts, selection: $model.draft.accountID)
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

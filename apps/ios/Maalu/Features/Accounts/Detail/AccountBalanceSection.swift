import SwiftUI

struct AccountBalanceSection: View {
    @Bindable var model: AccountDetailModel
    let account: Account

    var body: some View {
        Section {
            Picker("Range", selection: $model.range) {
                ForEach(AccountHistoryRange.allCases) { range in
                    Text(range.title).tag(range)
                }
            }
            .pickerStyle(.segmented)
            if model.points.count > 1 {
                AccountBalanceChart(points: model.points)
                if let first = model.points.first, let last = model.points.last {
                    summary("Start", first.balance)
                    summary("Now", last.balance)
                }
                if let low = model.lowest { summary("Lowest", low.balance) }
                if let high = model.highest { summary("Highest", high.balance) }
            }
        } header: {
            Text("Balance over time")
        }
    }

    private func summary(_ title: LocalizedStringKey, _ amount: String) -> some View {
        AmountRow { Text(title) } amount: { MoneyText(amount, currency: account.currency) }
    }
}

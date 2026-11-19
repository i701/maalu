import SwiftUI

/// How net worth moved over a period and what moved it: income, spending, balance adjustments, transfers across its edge and exchange rates.
struct NetWorthView: View {
    @Environment(Session.self) private var session
    @State private var model = NetWorthModel()

    var body: some View {
        @Bindable var model = model
        List {
            Section {
                Picker("Period", selection: $model.preset) {
                    ForEach(ComparePreset.allCases) { preset in
                        Text(preset.title).tag(preset)
                    }
                }
                if model.preset == .custom {
                    DatePicker("From", selection: $model.pickerFrom, displayedComponents: .date)
                    DatePicker("To", selection: $model.pickerTo, displayedComponents: .date)
                }
            } footer: {
                if let data = model.data {
                    Text("From the end of the day before \(dayText(data.startDate)) to the end of \(dayText(data.endDate)).")
                }
            }
            if let message = model.errorMessage {
                Text(message).foregroundStyle(.red)
            }
            if let data = model.data {
                Section {
                    AmountRow { Text("At the start") } amount: { MoneyText(data.startValue, currency: data.currency) }
                    AmountRow { Text("At the end") } amount: { MoneyText(data.endValue, currency: data.currency) }
                    AmountRow { Text("Change") } amount: { SignedMoneyText(value: data.changeValue, currency: data.currency) }
                } footer: {
                    Text(NetWorthText.sentence(data))
                }
                Section {
                    if model.movedDrivers.isEmpty {
                        Text("Nothing moved it: no money came in, went out or was corrected in this period.")
                            .foregroundStyle(.secondary)
                    } else {
                        NetWorthWaterfall(bars: model.bars)
                        ForEach(model.movedDrivers) { driver in
                            NetWorthDriverRow(driver: driver, currency: data.currency)
                        }
                    }
                } header: {
                    Text("What moved it")
                } footer: {
                    if !model.movedDrivers.isEmpty {
                        Text("Each bar starts where the one before ended, from zero (where you started) to the total change.")
                    }
                }
                if !data.accounts.isEmpty {
                    Section("Account by account") {
                        ForEach(data.accounts) { account in
                            NetWorthAccountRow(account: account, currency: data.currency)
                        }
                    }
                }
            }
        }
        .overlay { if model.isLoading && model.data == nil { ProgressView() } }
        .navigationTitle("Net Worth")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { await load() }
        .task(id: model.queryKey) { await load() }
    }

    private func dayText(_ isoDate: String) -> String {
        ISODate.date(isoDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? isoDate
    }

    private func load() async {
        guard let api = session.api else { return }
        await model.load(using: api)
    }
}

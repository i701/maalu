import SwiftUI

struct AvailableWorkingView: View {
    let available: AvailableToSpend

    var body: some View {
        List {
            Section("In your everyday accounts") {
                ForEach(available.accounts) { account in
                    WorkingRow(title: account.name, amount: account.balance, currency: available.currency)
                }
            }
            if !available.bills.isEmpty {
                Section("Bills still to pay") {
                    ForEach(available.bills) { bill in
                        WorkingRow(title: bill.title, amount: bill.amount, currency: available.currency,
                                   note: note(date: bill.date, overdue: bill.overdue, estimate: bill.estimate == true))
                    }
                }
            }
            if !available.cardPayments.isEmpty {
                Section("Credit card payments") {
                    ForEach(available.cardPayments) { payment in
                        WorkingRow(title: payment.title, amount: payment.amount, currency: available.currency,
                                   note: note(date: payment.date, overdue: payment.overdue, estimate: false))
                    }
                }
            }
            if !available.reserved.isEmpty {
                Section("Set aside for goals") {
                    ForEach(available.reserved) { reserve in
                        WorkingRow(title: reserve.name, amount: reserve.amount, currency: available.currency)
                    }
                }
            }
            Section {
                Text("Planned income is not counted until it arrives.")
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("The working")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func note(date: String, overdue: Bool, estimate: Bool) -> String {
        let day = ISODate.date(date)?.formatted(.dateTime.day().month()) ?? date
        let parts = [overdue ? String(localized: "Overdue") : nil, day, estimate ? String(localized: "estimate") : nil]
        return parts.compactMap { $0 }.joined(separator: " · ")
    }
}

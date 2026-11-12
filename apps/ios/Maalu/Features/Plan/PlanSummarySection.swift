import SwiftUI

struct PlanSummarySection: View {
    let available: AvailableToSpend
    let overdueCount: Int
    let firstShort: PlanRow?

    var body: some View {
        Section {
            AmountRow { Text("You have") } amount: { MoneyText(available.balance, currency: available.currency) }
            AmountRow {
                VStack(alignment: .leading) {
                    Text("Bills to pay")
                    if overdueCount > 0 {
                        Text("^[\(overdueCount) overdue](inflect: true)").font(.subheadline).foregroundStyle(.red)
                    }
                }
            } amount: {
                MoneyText(billsAndCards, currency: available.currency)
            }
            if reserved > 0 {
                AmountRow { Text("Set aside") } amount: { MoneyText(reserved, currency: available.currency) }
            }
            AmountRow {
                Text(available.isShort ? "Short by" : "Available")
            } amount: {
                MoneyText(available.magnitude, currency: available.currency)
                    .bold()
                    .foregroundStyle(available.isShort ? Color.red : Color.primary)
            }
        } footer: {
            verdict
        }
    }

    private var billsAndCards: Decimal {
        (Money.decimal(available.billsTotal) ?? 0) + (Money.decimal(available.cardPaymentsTotal) ?? 0)
    }

    private var reserved: Decimal { Money.decimal(available.reservedTotal) ?? 0 }

    @ViewBuilder private var verdict: some View {
        if let row = firstShort {
            Text("The money runs out at \(row.title) (\(BudgetText.shortDate(row.date))).")
        } else {
            Text("Everything planned for the rest of the period is covered.")
        }
    }
}

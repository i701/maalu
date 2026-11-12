import SwiftUI

struct AccountFactsSection: View {
    let account: Account
    let baseCurrency: String

    var body: some View {
        Section {
            LabeledContent("Group", value: String(localized: account.group.title))
            if let bank = account.bank { LabeledContent("Bank", value: bank) }
            if let number = account.accountNumber { LabeledContent("Number", value: number) }
            if account.currency != baseCurrency && !baseCurrency.isEmpty {
                LabeledContent("Exchange rate", value: (Money.decimal(account.exchangeRate) ?? 1).formatted() + (account.autoRate ? " · " + String(localized: "auto") : ""))
                LabeledContent("Worth", value: MoneyFormat.string(account.baseBalance, currency: baseCurrency))
            }
            if let limit = account.creditLimit { LabeledContent("Credit limit", value: MoneyFormat.string(limit, currency: account.currency)) }
            if let statement = account.statementDay, let due = account.dueDay {
                LabeledContent("Statement", value: String(localized: "Closes on day \(statement), due on day \(due)"))
            }
            if account.excludeFromStats { Label("Left out of my totals", systemImage: "eye.slash") }
            if let note = account.description, !note.isEmpty { Text(note) }
        }
    }
}

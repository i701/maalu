import SwiftUI

struct TransactionDetailContent: View {
    let transaction: Transaction

    var body: some View {
        List {
            Section {
                LabeledContent("Amount") { TransactionAmount(transaction: transaction) }
                LabeledContent("Type", value: String(localized: transaction.type.title))
                if let when {
                    LabeledContent("Date", value: when)
                }
                if transaction.type != .transfer {
                    LabeledContent("Category", value: transaction.category)
                    if let vendor = transaction.vendor { LabeledContent("Vendor", value: vendor.name) }
                    LabeledContent("Paid with", value: String(localized: transaction.paymentMethod.title))
                }
            }
            Section("Accounts") {
                if let account = transaction.account { LabeledContent(transaction.type == .transfer ? "From" : "Account", value: account.name) }
                if let toAccount = transaction.toAccount { LabeledContent("To", value: toAccount.name) }
                if let received, let toAccount = transaction.toAccount {
                    LabeledContent("Arrived") { Text(received, format: .currency(code: toAccount.currency).presentation(.isoCode)) }
                }
                if let rate { LabeledContent("Exchange rate", value: rate.formatted()) }
            }
            if hasMore {
                Section {
                    if let description = transaction.description, !description.isEmpty { Text(description) }
                    if !transaction.tags.isEmpty { LabeledContent("Tags", value: transaction.tags.map(\.name).formatted()) }
                    if let card = transaction.card { LabeledContent("Card", value: card.name) }
                    if let subscription = transaction.subscription { LabeledContent("Subscription", value: subscription.name) }
                    if transaction.planned { Label("Planned", systemImage: "calendar") }
                }
            }
        }
    }

    private var when: String? {
        guard let date = ISODate.date(transaction.transactionDate) else { return nil }
        let day = date.formatted(.dateTime.day().month(.wide).year())
        guard let time = transaction.transactionTime else { return day }
        return "\(day), \(time.prefix(5))"
    }

    private var received: Decimal? { transaction.toAmount.flatMap(Money.decimal) }

    private var rate: Decimal? {
        guard let rate = Money.decimal(transaction.exchangeRate), rate != 1 else { return nil }
        return rate
    }

    private var hasMore: Bool {
        transaction.description?.isEmpty == false || !transaction.tags.isEmpty
            || transaction.card != nil || transaction.subscription != nil || transaction.planned
    }
}

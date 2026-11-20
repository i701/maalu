import SwiftUI

struct TransactionDetailContent<Actions: View>: View {
    let transaction: Transaction
    let files: TransactionFilesModel
    @ViewBuilder let actions: Actions

    var body: some View {
        List {
            Section {
                LabeledContent("Amount") { TransactionAmount(transaction: transaction) }
                LabeledContent("Type", value: String(localized: transaction.type.title))
                if let when {
                    LabeledContent("Date", value: when)
                }
                if let of = transaction.refundOf {
                    LabeledContent("Refund of", value: "\(of.vendorName ?? of.category) · \(MoneyFormat.string(of.amount, currency: of.currency))")
                }
                if RefundRules.refunded(transaction) > 0 {
                    LabeledContent("Refunded", value: refundedText)
                }
                if transaction.type != .transfer {
                    LabeledContent("Category", value: transaction.category)
                    if let vendor = transaction.vendor { LabeledContent("Vendor", value: vendor.name) }
                    LabeledContent("Paid with", value: String(localized: transaction.paymentMethod.title))
                }
            }
            if !transaction.splits.isEmpty {
                TransactionItemsList(items: transaction.splits, currency: transaction.currency)
            }
            Section("Accounts") {
                if let account = transaction.account { LabeledContent(transaction.type == .transfer ? "From" : "Account", value: account.name) }
                if let toAccount = transaction.toAccount { LabeledContent("To", value: toAccount.name) }
                if let received, let toAccount = transaction.toAccount {
                    LabeledContent("Arrived") { MoneyText(received, currency: toAccount.currency) }
                }
                if let rate { LabeledContent("Exchange rate", value: rate.formatted()) }
            }
            if hasMore {
                Section {
                    if let description = transaction.description, !description.isEmpty { Text(description) }
                    if !transaction.tags.isEmpty { LabeledContent("Tags", value: transaction.tags.map(\.name).formatted()) }
                    if let card = transaction.card { LabeledContent("Card", value: card.name) }
                    if let subscription = transaction.subscription { LabeledContent("Subscription", value: subscription.name) }
                    if let group = transaction.group { LabeledContent("Group", value: group.name) }
                    if transaction.planned { Label("Planned", systemImage: "calendar") }
                }
            }
            if let location = transaction.location {
                TransactionLocationMap(location: location)
            }
            TransactionFilesSection(model: files, canAdd: transaction.deletedAt == nil)
            actions
        }
        .transactionFilesPresentations(files)
    }

    private var refundedText: String {
        let refunded = RefundRules.refunded(transaction)
        let amount = MoneyFormat.string(refunded, currency: transaction.currency)
        return RefundRules.canRefund(transaction) ? amount : String(localized: "Fully refunded, \(amount)")
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
            || transaction.card != nil || transaction.subscription != nil || transaction.group != nil || transaction.planned
    }
}

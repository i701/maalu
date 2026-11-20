import SwiftUI

struct TransactionDetailContent<Quick: View, Actions: View>: View {
    let transaction: Transaction
    let files: TransactionFilesModel
    @ViewBuilder let quickActions: Quick
    @ViewBuilder let actions: Actions

    /// White cards on the light grey page.
    private static var cardFill: Color { Color(.secondarySystemGroupedBackground) }

    var body: some View {
        List {
            Section {
                TransactionDetailHeader(transaction: transaction) { quickActions }
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 4, leading: 4, bottom: 8, trailing: 4))
            if !transaction.splits.isEmpty {
                TransactionItemsList(items: transaction.splits, currency: transaction.currency)
                    .listRowBackground(Self.cardFill)
            }
            Section("Details") {
                if let of = transaction.refundOf {
                    LabeledContent("Refund of", value: "\(of.vendorName ?? of.category) · \(MoneyFormat.string(of.amount, currency: of.currency))")
                }
                if RefundRules.refunded(transaction) > 0 {
                    LabeledContent("Refunded", value: refundedText)
                }
                if transaction.type != .transfer {
                    if let vendor = transaction.vendor { LabeledContent("Vendor", value: vendor.name) }
                    LabeledContent("Paid with", value: String(localized: transaction.paymentMethod.title))
                }
                if let account = transaction.account { LabeledContent(transaction.type == .transfer ? "From" : "Account", value: account.name) }
                if let toAccount = transaction.toAccount { LabeledContent("To", value: toAccount.name) }
                if let received, let toAccount = transaction.toAccount {
                    LabeledContent("Arrived") { MoneyText(received, currency: toAccount.currency) }
                }
                if let rate { LabeledContent("Exchange rate", value: rate.formatted()) }
                if let card = transaction.card { LabeledContent("Card", value: card.name) }
                if let subscription = transaction.subscription { LabeledContent("Subscription", value: subscription.name) }
                if let group = transaction.group { LabeledContent("Group", value: group.name) }
                if !transaction.tags.isEmpty { LabeledContent("Tags", value: transaction.tags.map(\.name).formatted()) }
            }
            .listRowBackground(Self.cardFill)
            if let description = transaction.description, !description.isEmpty {
                Section("Note") {
                    Text(description)
                }
                .listRowBackground(Self.cardFill)
            }
            if let location = transaction.location {
                TransactionLocationMap(location: location)
                    .listRowBackground(Self.cardFill)
            }
            TransactionFilesSection(model: files, canAdd: transaction.deletedAt == nil)
                .listRowBackground(Self.cardFill)
            actions
                .listRowBackground(Self.cardFill)
        }
        .gradientHeader(.gray)
        .transactionFilesPresentations(files)
    }

    private var refundedText: String {
        let refunded = RefundRules.refunded(transaction)
        let amount = MoneyFormat.string(refunded, currency: transaction.currency)
        return RefundRules.canRefund(transaction) ? amount : String(localized: "Fully refunded, \(amount)")
    }

    private var received: Decimal? { transaction.toAmount.flatMap(Money.decimal) }

    private var rate: Decimal? {
        guard let rate = Money.decimal(transaction.exchangeRate), rate != 1 else { return nil }
        return rate
    }
}

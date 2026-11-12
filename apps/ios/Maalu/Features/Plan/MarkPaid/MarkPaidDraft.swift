import SwiftUI

/// What is sent when a planned transaction is marked as paid, received or done.
struct MarkPaidDraft {
    var date = Date.now
    var amount: Decimal?
    var rate: Decimal?
    /// What a bill in another currency really cost, in the base currency; it wins over the rate.
    var charged: Decimal?

    private let plannedRate: Decimal
    let isForeign: Bool
    let isTransfer: Bool
    let verb: Verb

    enum Verb {
        case paid, received, done

        var action: LocalizedStringResource {
            switch self {
            case .paid: "Mark as paid"
            case .received: "Mark as received"
            case .done: "Mark as done"
            }
        }

        var amountLabel: LocalizedStringKey {
            switch self {
            case .received: "Amount received"
            default: "Amount paid"
            }
        }
    }

    init(planned: Transaction, baseCurrency: String) {
        amount = Money.decimal(planned.amount)
        rate = Money.decimal(planned.exchangeRate)
        plannedRate = Money.decimal(planned.exchangeRate) ?? 1
        isForeign = planned.currency != baseCurrency
        isTransfer = planned.type == .transfer
        verb = switch planned.type {
        case .transfer: .done
        case .income: .received
        case .expense: .paid
        }
    }

    var problem: LocalizedStringResource? {
        if isTransfer { return nil }
        guard let amount, amount > 0 else { return "Enter an amount above zero." }
        if isForeign, charged == nil, (rate ?? 0) <= 0 { return "Enter the exchange rate or what it cost." }
        return nil
    }

    /// What it comes to in the base currency, for a bill in another currency.
    var costInBase: Decimal? {
        guard isForeign, let amount else { return nil }
        if let charged { return charged }
        return rate.map { amount * $0 }
    }

    /// A transfer sends only its day. Otherwise the amount goes; for another currency what it really cost wins (the rate
    /// is worked out from it), else a rate that differs from the planned one, and an unchanged rate is left out.
    func request() -> MarkPaidRequest {
        var request = MarkPaidRequest(transactionDate: ISODate.string(date))
        guard !isTransfer, let amount else { return request }
        request.amount = Money.string(amount)
        guard isForeign else { return request }
        if let charged {
            request.baseAmount = Money.string(charged)
        } else if let rate, rate != plannedRate {
            request.exchangeRate = Money.string(rate)
        }
        return request
    }
}

import Foundation

enum NetWorthDriverKey: String, Decodable {
    case income, spending, adjustments, transfers, exchangeRates = "exchange_rates"

    var title: LocalizedStringResource {
        switch self {
        case .income: "Income"
        case .spending: "Spending"
        case .adjustments: "Balance adjustments"
        case .transfers: "Transfers across net worth"
        case .exchangeRates: "Exchange rates"
        }
    }

    var help: LocalizedStringResource {
        switch self {
        case .income: "Money that came in, not counting refunds."
        case .spending: "Money that went out, less what refunds gave back."
        case .adjustments: "Corrections that made an account match its bank."
        case .transfers: "Money moved to or from an account that is not part of net worth (archived, or left out of the stats)."
        case .exchangeRates: "Accounts in another currency are worth a different amount in your base currency when their rate changes."
        }
    }
}

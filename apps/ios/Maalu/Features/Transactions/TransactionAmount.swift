import SwiftUI

/// Income is green with a plus, an expense red with a minus, and a transfer has no direction so it stays neutral. In light mode the colours are the deeper ones, so they read on the sky blue backdrop; the system ones suit midnight.
struct TransactionAmount: View {
    let transaction: Transaction
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        if let value = transaction.signedAmount {
            if transaction.type == .transfer {
                MoneyText(value, currency: transaction.currency)
            } else {
                MoneyText(value, currency: transaction.currency, sign: .always())
                    .foregroundStyle(color)
            }
        } else {
            Text(transaction.amount)
        }
    }

    private var color: Color {
        let isLight = scheme == .light
        if transaction.type == .income { return isLight ? .success : .green }
        return isLight ? Color(red: 0.75, green: 0.09, blue: 0.12) : .red
    }
}

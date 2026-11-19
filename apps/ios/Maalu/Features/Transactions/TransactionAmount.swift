import SwiftUI

struct TransactionAmount: View {
    let transaction: Transaction

    var body: some View {
        if let value = transaction.signedAmount {
            if transaction.type == .transfer {
                MoneyText(value, currency: transaction.currency)
            } else {
                MoneyText(value, currency: transaction.currency, sign: .always())
                    .foregroundStyle(transaction.type == .income ? Color.green : Color.red)
            }
        } else {
            Text(transaction.amount)
        }
    }
}

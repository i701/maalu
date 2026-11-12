import SwiftUI

struct TransactionAmount: View {
    let transaction: Transaction

    var body: some View {
        if let value = transaction.signedAmount {
            if transaction.type == .transfer {
                Text(value, format: .currency(code: transaction.currency).presentation(.isoCode))
                    .monospacedDigit()
            } else {
                Text(value, format: .currency(code: transaction.currency).presentation(.isoCode).sign(strategy: .always()))
                    .monospacedDigit()
                    .foregroundStyle(transaction.type == .income ? Color.green : Color.red)
            }
        } else {
            Text(transaction.amount)
        }
    }
}

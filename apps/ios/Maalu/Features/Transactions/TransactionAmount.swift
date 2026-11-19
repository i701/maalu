import SwiftUI

struct TransactionAmount: View {
    let transaction: Transaction

    var body: some View {
        if let value = transaction.signedAmount {
            if transaction.type == .transfer {
                Text(value, format: .currency(code: transaction.currency).presentation(.isoCode))
                    .numericFont()
            } else {
                Text(value, format: .currency(code: transaction.currency).presentation(.isoCode).sign(strategy: .always()))
                    .numericFont()
                    .foregroundStyle(transaction.type == .income ? Color.green : Color.red)
            }
        } else {
            Text(transaction.amount)
        }
    }
}

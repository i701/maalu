import SwiftUI

/// A varying bill is "about", a steady one is exact.
struct SubscriptionAmountText: View {
    let amount: String
    let currency: String
    let varies: Bool

    var body: some View {
        if varies {
            Text("about \(MoneyFormat.string(amount, currency: currency))").numericFont()
        } else {
            MoneyText(amount, currency: currency)
        }
    }
}

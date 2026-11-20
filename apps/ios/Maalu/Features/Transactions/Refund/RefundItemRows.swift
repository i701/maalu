import SwiftUI

/// The items of a purchase, each with a switch and, once on, the amount to give back. `isLocked` is an existing refund, whose items cannot change.
struct RefundItemRows: View {
    @Binding var items: [RefundItem]
    let currency: String
    var isLocked = false

    var body: some View {
        ForEach($items) { $item in
            VStack(alignment: .leading, spacing: 4) {
                Toggle(isOn: $item.isOn) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                        Text(isLocked ? item.category : "\(item.category) · \(MoneyFormat.string(item.left, currency: currency)) left")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }
                .disabled(isLocked || item.left <= 0)
                if item.isOn {
                    DecimalField("Amount in \(currency)", value: $item.amount)
                }
            }
        }
    }
}

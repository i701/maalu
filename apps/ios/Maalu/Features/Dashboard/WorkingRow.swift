import SwiftUI

struct WorkingRow: View {
    let title: String
    let amount: String
    let currency: String
    var note: String?

    var body: some View {
        AmountRow {
            VStack(alignment: .leading) {
                Text(title)
                if let note { Text(note).font(.subheadline).foregroundStyle(.secondary) }
            }
        } amount: {
            MoneyText(amount, currency: currency)
        }
    }
}

import SwiftUI

struct WorkingRow: View {
    let title: String
    let amount: String
    let currency: String
    var note: String?

    var body: some View {
        LabeledContent {
            MoneyText(amount, currency: currency)
        } label: {
            Text(title)
            if let note { Text(note).foregroundStyle(.secondary) }
        }
    }
}

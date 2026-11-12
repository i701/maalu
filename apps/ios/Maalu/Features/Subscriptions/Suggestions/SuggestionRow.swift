import SwiftUI

struct SuggestionRow: View {
    let candidate: SubscriptionCandidate
    let onAdd: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            AmountRow {
                Text(candidate.vendorName)
            } amount: {
                SubscriptionAmountText(amount: candidate.amount, currency: candidate.currency, varies: candidate.amountVaries)
            }
            Text(candidate.detailLine)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            HStack {
                Button("Add", action: onAdd)
                    .buttonStyle(.borderedProminent)
                Button("Not a subscription", action: onDismiss)
                    .buttonStyle(.borderless)
            }
        }
    }
}

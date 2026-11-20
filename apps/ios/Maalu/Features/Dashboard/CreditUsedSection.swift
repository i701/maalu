import SwiftUI

struct CreditUsedSection: View {
    let cards: [CreditCardUsage]

    var body: some View {
        Section {
            ForEach(cards) { card in
                VStack(alignment: .leading) {
                    AmountRow {
                        VStack(alignment: .leading) {
                            Text(card.account.name)
                            Text("\(MoneyFormat.string(card.usage.owed, currency: card.account.currency)) of \(MoneyFormat.string(card.usage.limit, currency: card.account.currency))")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    } amount: {
                        Text("\(card.usage.percent)%")
                            .foregroundStyle(card.usage.isHigh ? Color.red : Color.secondary)
                            .numericFont()
                    }
                    CapsuleProgress(value: min(Double(card.usage.percent) / 100, 1))
                        .tint(card.usage.isHigh ? Color.red : Color.accentColor)
                }
            }
        } header: {
            SectionTitle("Credit used")
        }
    }
}

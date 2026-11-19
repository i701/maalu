import SwiftUI

struct CardRow: View {
    let card: Card

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            Label(card.label, systemImage: "creditcard")
            Text(details)
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }

    /// "Credit card · repaid from BML Current".
    private var details: String {
        let kind = String(localized: card.kind.title)
        guard let repay = card.repayAccount else { return kind }
        return String(localized: "\(kind) · repaid from \(repay.name)")
    }
}

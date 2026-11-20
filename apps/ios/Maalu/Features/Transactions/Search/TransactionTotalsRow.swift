import SwiftUI

/// What the matching transactions add up to: spent, income and what is left, in three columns.
struct TransactionTotalsRow: View {
    let totals: TransactionTotals

    var body: some View {
        HStack(alignment: .top) {
            column("Total spent", amount: totals.expenseValue, color: .primary)
            Divider()
            column("Total income", amount: totals.incomeValue, color: .success)
            Divider()
            column("Net", amount: totals.kept, color: totals.kept < 0 ? .red : .success)
        }
        .fixedSize(horizontal: false, vertical: true)
    }

    private func column(_ title: LocalizedStringKey, amount: Decimal, color: Color) -> some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption2.weight(.semibold))
                .textCase(.uppercase)
                .foregroundStyle(.secondary)
            MoneyText(amount, currency: totals.currency)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(color)
                .minimumScaleFactor(0.7)
                .lineLimit(1)
                .contentTransition(.numericText(value: NSDecimalNumber(decimal: amount).doubleValue))
        }
        .frame(maxWidth: .infinity)
    }
}

import SwiftUI

struct TransactionDaySection: View {
    let day: TransactionDay
    let selection: TransactionSelection
    let onTap: (Transaction) -> Void
    /// Press and hold starts picking with this row ticked.
    let onHold: (Transaction) -> Void

    var body: some View {
        Section {
            ForEach(day.transactions) { transaction in
                HStack {
                    if selection.isSelecting {
                        Image(systemName: selection.contains(transaction.id) ? "checkmark.circle.fill" : "circle")
                            .foregroundStyle(selection.contains(transaction.id) ? Color.accentColor : Color.secondary)
                    }
                    TransactionRow(transaction: transaction)
                }
                .contentShape(.rect)
                .listRowSeparator(.hidden)
                // the cards' fill; a plain list's own would be pure black in dark mode
                .listRowBackground(Color(.secondarySystemGroupedBackground))
                .listRowInsets(EdgeInsets(top: 7, leading: Spacing.screen + Spacing.card, bottom: 7, trailing: Spacing.screen + Spacing.card))
                .onTapGesture { onTap(transaction) }
                .onLongPressGesture { onHold(transaction) }
                .accessibilityAddTraits(selection.contains(transaction.id) ? [.isButton, .isSelected] : .isButton)
                .accessibilityAction(named: "Select") { onHold(transaction) }
            }
        } header: {
            Text(day.heading())
                .font(.footnote.weight(.semibold))
                .textCase(.uppercase)
                .tracking(0.3)
                .padding(.horizontal, Spacing.card - Spacing.screen)
        }
    }
}

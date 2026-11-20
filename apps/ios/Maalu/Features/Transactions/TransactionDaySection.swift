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
                .onTapGesture { onTap(transaction) }
                .onLongPressGesture { onHold(transaction) }
                .accessibilityAddTraits(selection.contains(transaction.id) ? [.isButton, .isSelected] : .isButton)
                .accessibilityAction(named: "Select") { onHold(transaction) }
            }
        } header: {
            Text(day.heading())
        }
    }
}

import SwiftUI

/// A credit card's last statement: what was owed when it closed, what has been paid since, what is still to pay and by when.
/// Spending since it closed goes on the next one.
struct AccountStatementSection: View {
    let statement: CardStatement
    /// Starts a repayment; nil when the card has no account to be repaid from.
    let onRepay: (() -> Void)?

    var body: some View {
        let status = CardStatementText.status(statement)
        Section {
            Text(CardStatementText.line(statement))
            AmountRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text("On the statement")
                    Text("Closed \(CardStatementText.day(statement.closedOn))").font(.subheadline).foregroundStyle(.secondary)
                }
            } amount: {
                MoneyText(statement.statementBalance, currency: statement.currency)
            }
            AmountRow {
                Text("Paid since")
            } amount: {
                MoneyText(statement.paidSince, currency: statement.currency)
            }
            AmountRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Still to pay")
                    Text("Due \(CardStatementText.day(statement.dueOn))").font(.subheadline).foregroundStyle(.secondary)
                }
            } amount: {
                MoneyText(statement.remaining, currency: statement.currency)
            }
            AmountRow {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Spent since")
                    Text("Next closes \(CardStatementText.day(statement.nextClosesOn))").font(.subheadline).foregroundStyle(.secondary)
                }
            } amount: {
                MoneyText(statement.spentSince, currency: statement.currency)
            }
            if statement.owes, let onRepay {
                Button("Repay", systemImage: "arrow.right.circle", action: onRepay)
            }
        } header: {
            HStack {
                Text("Statement")
                Spacer()
                StatementChip(label: status.label, tone: status.tone)
            }
        } footer: {
            Text(CardStatementText.schedule(statement))
        }
    }
}

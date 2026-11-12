import SwiftUI

struct PlanRowView: View {
    let row: PlanRow
    let currency: String

    var body: some View {
        AmountRow {
            VStack(alignment: .leading, spacing: 2) {
                Text(row.title)
                if let detail { Text(detail).font(.subheadline).foregroundStyle(.secondary) }
                if row.isShort {
                    Label("Short from here", systemImage: "exclamationmark.triangle").font(.subheadline).foregroundStyle(.red)
                }
            }
        } amount: {
            VStack(alignment: .trailing, spacing: 2) {
                Text(prefix + MoneyFormat.string(row.amount, currency: currency)).monospacedDigit()
                if let left = row.left {
                    Text("Left \(MoneyFormat.string(left, currency: currency))")
                        .font(.subheadline)
                        .foregroundStyle(left < 0 ? Color.red : Color.secondary)
                        .monospacedDigit()
                } else {
                    Text("Expected · not counted").font(.subheadline).foregroundStyle(.secondary)
                }
            }
        }
    }

    /// "≈ " for an amount that is only the usual one, since the real figure is entered when it is paid.
    private var prefix: String { row.isEstimate ? "≈ " : "" }

    private var detail: String? {
        var parts: [String] = []
        if row.kind == .card { parts.append(String(localized: "Credit card statement")) }
        if row.isTransfer { parts.append(String(localized: "Transfer")) }
        if let account = row.account { parts.append(account) }
        if let subscription = row.subscription { parts.append(subscription) }
        if row.isEstimate { parts.append(String(localized: "Estimate")) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

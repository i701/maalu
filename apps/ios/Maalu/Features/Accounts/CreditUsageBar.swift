import SwiftUI

struct CreditUsageBar: View {
    let usage: CreditUsage
    let currency: String

    var body: some View {
        VStack(alignment: .leading) {
            CapsuleProgress(value: min(Double(usage.percent) / 100, 1))
                .tint(usage.isHigh ? Color.red : Color.accentColor)
            Text("\(usage.percent)% of \(MoneyFormat.string(usage.limit, currency: currency)) used")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }
}

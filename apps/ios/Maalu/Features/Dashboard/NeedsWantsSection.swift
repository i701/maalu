import SwiftUI

struct NeedsWantsSection: View {
    let shares: [KindShare]
    let currency: String

    var body: some View {
        Section("Needs and wants") {
            ForEach(shares) { share in
                VStack(alignment: .leading) {
                    AmountRow {
                        Text(share.kind.title)
                    } amount: {
                        Text("\(MoneyFormat.string(share.total, currency: currency)) · \(share.share, format: .percent.precision(.fractionLength(0)))")
                            .monospacedDigit()
                    }
                    ProgressView(value: share.share)
                        .tint(share.kind == .need ? Color.blue : share.kind == .want ? Color.orange : Color.gray)
                }
            }
        }
    }
}

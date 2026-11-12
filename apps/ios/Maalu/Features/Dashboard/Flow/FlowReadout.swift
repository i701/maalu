import SwiftUI

struct FlowReadout: View {
    let node: MoneyFlow.Node?
    let total: Double
    let currency: String

    var body: some View {
        if let node {
            let share = total > 0 ? node.value / total : 0
            Text("\(node.label) · \(MoneyFormat.string(Decimal(node.value), currency: currency)) · \(share, format: .percent.precision(.fractionLength(0...1))) of the total")
                .font(.subheadline)
        } else {
            Text("Tap a band to see its amount and share.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}

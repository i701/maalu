import SwiftUI

struct MoneyFlowTable: View {
    let flow: MoneyFlow
    let currency: String

    var body: some View {
        let names = Dictionary(uniqueKeysWithValues: flow.nodes.map { ($0.id, $0.label) })
        ForEach(flow.links) { link in
            AmountRow {
                Text("\(names[link.source] ?? "") → \(names[link.target] ?? "")")
            } amount: {
                Text(MoneyFormat.string(Decimal(link.value), currency: currency)).monospacedDigit()
            }
        }
    }
}

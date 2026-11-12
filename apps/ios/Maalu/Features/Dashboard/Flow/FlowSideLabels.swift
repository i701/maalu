import SwiftUI

struct FlowSideLabels: View {
    let layout: FlowLayout
    let column: Int
    let currency: String
    let labelWidth: Double
    let totalWidth: Double
    let height: Double
    let selectedID: String?
    let onSelect: (String) -> Void

    private static let labelHeight = 34.0

    var body: some View {
        let side = layout.nodes.filter { $0.node.column == column }
        let tops = LabelSpread.positions(side.map { $0.centerY - Self.labelHeight / 2 }, gap: Self.labelHeight + 4, limit: height - Self.labelHeight)
        ForEach(Array(zip(side, tops)), id: \.0.id) { placed, top in
            Button { onSelect(placed.id) } label: {
                VStack(alignment: column == 0 ? .trailing : .leading) {
                    Text(placed.node.label)
                        .font(.footnote)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Text(MoneyFormat.string(Decimal(placed.node.value), currency: currency))
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.7)
                }
                .frame(width: labelWidth - 8, alignment: column == 0 ? .trailing : .leading)
            }
            .buttonStyle(.plain)
            .opacity(selectedID == nil || selectedID == placed.id ? 1 : 0.4)
            .offset(x: column == 0 ? 0 : totalWidth - labelWidth + 8, y: top)
        }
    }
}

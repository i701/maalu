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
    /// A group in a deeper diagram is labelled just left of its bar, over the bands coming in, so it gets a backing.
    var isInner = false

    private static let labelHeight = 34.0

    private var standsLeftOfBar: Bool { column == 0 || isInner }

    var body: some View {
        let side = layout.nodes.filter { $0.node.column == column }
        let tops = LabelSpread.positions(side.map { $0.centerY - Self.labelHeight / 2 }, gap: Self.labelHeight + 4, limit: height - Self.labelHeight)
        ForEach(Array(zip(side, tops)), id: \.0.id) { placed, top in
            Button { onSelect(placed.id) } label: {
                VStack(alignment: standsLeftOfBar ? .trailing : .leading) {
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
                .frame(width: labelWidth - 8, alignment: standsLeftOfBar ? .trailing : .leading)
                .background(isInner ? AnyShapeStyle(.background.opacity(0.7)) : AnyShapeStyle(.clear), in: .rect(cornerRadius: 4))
            }
            .buttonStyle(.plain)
            .opacity(selectedID == nil || selectedID == placed.id ? 1 : 0.4)
            .offset(x: offsetX(of: placed), y: top)
        }
    }

    private func offsetX(of placed: FlowLayout.PlacedNode) -> Double {
        if column == 0 { return 0 }
        return isInner ? placed.x + 2 : totalWidth - labelWidth + 8
    }
}

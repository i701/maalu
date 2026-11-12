import SwiftUI

struct MoneyFlowDiagram: View {
    let flow: MoneyFlow
    let currency: String
    /// A fixed size for the expanded canvas; nil fits the diagram to the card it sits in.
    var canvasSize: CGSize?
    @State private var width = 0.0
    @State private var selectedID: String?

    private static let labelWidth = 88.0
    private static let height = 290.0
    private static let nodeWidth = 4.0
    private static let bandOpacity = 0.32
    private static let selectedOpacity = 0.55
    private static let dimmedOpacity = 0.12

    private var size: CGSize {
        canvasSize ?? CGSize(width: width, height: Self.height)
    }

    private var layout: FlowLayout {
        FlowLayout.make(flow, width: max(size.width - Self.labelWidth * 2, 0), height: size.height, nodeWidth: Self.nodeWidth)
    }

    var body: some View {
        let layout = layout
        VStack(alignment: .leading) {
            ZStack(alignment: .topLeading) {
                Canvas { context, _ in
                    for link in layout.links {
                        let isIncoming = link.link.target == "total"
                        let (startX, endX) = layout.span(of: link)
                        let opacity = opacity(for: layout.outerNodeID(of: link))
                        let from = layout.nodeColor(of: link, incoming: isIncoming, start: true)
                        let to = layout.nodeColor(of: link, incoming: isIncoming, start: false)
                        let shading = GraphicsContext.Shading.linearGradient(
                            Gradient(colors: [from.opacity(opacity), to.opacity(opacity)]),
                            startPoint: CGPoint(x: startX, y: 0),
                            endPoint: CGPoint(x: endX, y: 0)
                        )
                        var path = Path()
                        let middle = (startX + endX) / 2
                        path.move(to: CGPoint(x: startX, y: link.y0))
                        path.addCurve(to: CGPoint(x: endX, y: link.y1), control1: CGPoint(x: middle, y: link.y0), control2: CGPoint(x: middle, y: link.y1))
                        context.stroke(path, with: shading, style: StrokeStyle(lineWidth: link.thickness))
                    }
                    for placed in layout.nodes where placed.node.kind != .total {
                        let rect = CGRect(x: placed.x, y: placed.y, width: placed.width, height: placed.height)
                        let isDimmed = selectedID != nil && selectedID != placed.id
                        context.fill(Path(roundedRect: rect, cornerRadius: 1.5), with: .color(Color(flow: placed.node.kind).opacity(isDimmed ? 0.3 : 1)))
                    }
                }
                .onTapGesture { location in
                    select(layout.nodeID(at: location))
                }
                .padding(.horizontal, Self.labelWidth)
                FlowSideLabels(layout: layout, column: 0, currency: currency, labelWidth: Self.labelWidth, totalWidth: size.width, height: size.height, selectedID: selectedID, onSelect: select)
                FlowSideLabels(layout: layout, column: 2, currency: currency, labelWidth: Self.labelWidth, totalWidth: size.width, height: size.height, selectedID: selectedID, onSelect: select)
            }
            .frame(width: canvasSize?.width, height: size.height)
            .onGeometryChange(for: Double.self) { $0.size.width } action: { width = $0 }
            FlowReadout(node: flow.nodes.first { $0.id == selectedID }, total: flow.total, currency: currency)
        }
    }

    private func opacity(for nodeID: String) -> Double {
        guard let selectedID else { return Self.bandOpacity }
        return selectedID == nodeID ? Self.selectedOpacity : Self.dimmedOpacity
    }

    private func select(_ id: String?) {
        selectedID = id == selectedID ? nil : id
    }
}

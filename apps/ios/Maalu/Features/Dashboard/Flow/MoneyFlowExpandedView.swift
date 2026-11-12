import SwiftUI

/// The money flow on a canvas of its own: wide, scrollable in both directions, with pinch to zoom.
struct MoneyFlowExpandedView: View {
    let flow: MoneyFlow
    let currency: String
    @Environment(\.dismiss) private var dismiss
    /// How far in from the size that fits the screen: 1 shows the whole diagram.
    @State private var zoomFactor = 1.0
    @State private var zoomAtGestureStart = 1.0
    @State private var viewport = CGSize.zero

    private static let baseSize = CGSize(width: 640, height: 600)
    private static let zoomRange = 1.0...4.0
    private static let zoomStep = 0.5

    /// The scale at which the whole diagram fits the width of the screen.
    private var fitScale: Double {
        viewport.width > 0 ? min(1, (viewport.width - 8) / Self.baseSize.width) : 1
    }

    private var scale: Double { fitScale * zoomFactor }

    var body: some View {
        NavigationStack {
            ScrollView([.horizontal, .vertical]) {
                MoneyFlowDiagram(
                    flow: flow,
                    currency: currency,
                    canvasSize: CGSize(width: Self.baseSize.width * scale, height: Self.baseSize.height * scale)
                )
                .padding(.horizontal, 4)
                .padding(.vertical)
                .frame(minWidth: viewport.width, minHeight: viewport.height)
            }
            .onGeometryChange(for: CGSize.self) { $0.size } action: { viewport = $0 }
            .defaultScrollAnchor(.center)
            .simultaneousGesture(
                MagnifyGesture()
                    .onChanged { zoom(to: zoomAtGestureStart * $0.magnification) }
                    .onEnded { _ in zoomAtGestureStart = zoomFactor }
            )
            .navigationTitle("Money flow")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                }
                ToolbarItemGroup(placement: .primaryAction) {
                    Button("Zoom out", systemImage: "minus.magnifyingglass") { step(-Self.zoomStep) }
                        .disabled(zoomFactor <= Self.zoomRange.lowerBound)
                    Button("Zoom in", systemImage: "plus.magnifyingglass") { step(Self.zoomStep) }
                        .disabled(zoomFactor >= Self.zoomRange.upperBound)
                }
            }
        }
    }

    private func zoom(to value: Double) {
        zoomFactor = min(max(value, Self.zoomRange.lowerBound), Self.zoomRange.upperBound)
    }

    private func step(_ amount: Double) {
        zoom(to: zoomFactor + amount)
        zoomAtGestureStart = zoomFactor
    }
}

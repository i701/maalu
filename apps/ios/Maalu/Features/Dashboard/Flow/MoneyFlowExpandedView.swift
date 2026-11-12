import SwiftUI

/// The money flow on a canvas of its own: wide, scrollable in both directions, with pinch to zoom.
struct MoneyFlowExpandedView: View {
    let flow: MoneyFlow
    let currency: String
    @Environment(\.dismiss) private var dismiss
    @State private var scale = 1.0
    @State private var scaleAtGestureStart = 1.0
    @State private var viewport = CGSize.zero

    private static let baseSize = CGSize(width: 640, height: 600)
    private static let scaleRange = 0.55...3.0
    private static let zoomStep = 0.25

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
                    .onChanged { zoom(to: scaleAtGestureStart * $0.magnification) }
                    .onEnded { _ in scaleAtGestureStart = scale }
            )
            .navigationTitle("Money flow")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done", action: dismiss.callAsFunction)
                }
                ToolbarItemGroup(placement: .primaryAction) {
                    Button("Zoom out", systemImage: "minus.magnifyingglass") { step(-Self.zoomStep) }
                        .disabled(scale <= Self.scaleRange.lowerBound)
                    Button("Zoom in", systemImage: "plus.magnifyingglass") { step(Self.zoomStep) }
                        .disabled(scale >= Self.scaleRange.upperBound)
                }
            }
        }
    }

    private func zoom(to value: Double) {
        scale = min(max(value, Self.scaleRange.lowerBound), Self.scaleRange.upperBound)
    }

    private func step(_ amount: Double) {
        zoom(to: scale + amount)
        scaleAtGestureStart = scale
    }
}

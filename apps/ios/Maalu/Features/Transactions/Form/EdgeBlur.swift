import SwiftUI

/// A band of blur that fades out toward the content, for the top or bottom edge of a scrolling container: a material masked by a gradient, so what scrolls under it dissolves into blur instead of being cut off. SwiftUI's own scroll edge effect only reaches the scroll view a bar sits on, which is not the vertical form inside the horizontal pages.
struct EdgeBlur: View {
    let edge: VerticalEdge
    let height: CGFloat

    var body: some View {
        Rectangle()
            .fill(.ultraThinMaterial)
            .mask(
                LinearGradient(
                    colors: [.black, .clear],
                    startPoint: edge == .top ? .top : .bottom,
                    endPoint: edge == .top ? .bottom : .top
                )
            )
            .frame(height: height)
            .allowsHitTesting(false)
    }
}

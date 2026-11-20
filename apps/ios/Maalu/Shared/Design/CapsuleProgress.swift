import SwiftUI

/// A thin rounded progress bar: the tint (the surrounding `.tint`, the brand's blue unless set) filled over a paler track.
struct CapsuleProgress: View {
    /// 0 to 1.
    let value: Double

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .leading) {
                Capsule().fill(.tint.opacity(0.2))
                Capsule().fill(.tint)
                    .frame(width: fillWidth(in: proxy.size.width))
            }
        }
        .frame(height: 8)
        .accessibilityElement(children: .ignore)
    }

    /// Anything above nothing shows at least a dot, so a small amount is not invisible.
    private func fillWidth(in width: CGFloat) -> CGFloat {
        let share = min(max(value, 0), 1)
        return share == 0 ? 0 : max(8, width * share)
    }
}

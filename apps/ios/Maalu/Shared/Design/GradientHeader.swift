import SwiftUI

extension View {
    /// A pale wash of the screen's accent (the brand's blue unless it has its own hue, as on the web) at the top of the page, fading to the page's own colour, so a white card on it has something to stand against.
    /// Put it on a list or scroll view, which must not draw its own background.
    func gradientHeader(_ accent: Color = .brand) -> some View {
        scrollContentBackground(.hidden)
            .background(alignment: .top) {
                LinearGradient(
                    colors: [accent.opacity(0.2), accent.opacity(0.06), Color(.systemBackground)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                .frame(height: 360)
                .frame(maxWidth: .infinity)
                .background(Color(.systemBackground))
                .ignoresSafeArea()
            }
    }
}

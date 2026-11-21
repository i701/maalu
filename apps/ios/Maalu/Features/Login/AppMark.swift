import SwiftUI

/// The Maalu mark (`maalu.svg`, the app icon's glyph) on its own: navy on the sky, light blue on midnight.
struct AppMark: View {
    @Environment(\.colorScheme) private var scheme

    var body: some View {
        Image("MaaluMark")
            .resizable()
            .scaledToFit()
            .foregroundStyle(scheme == .dark ? Color(red: 0.55, green: 0.78, blue: 1) : Color(red: 0, green: 0.114, blue: 0.29))
            .frame(width: 300, height: 300)
            .frame(height: 90)
            .clipped()
            .accessibilityLabel("Maalu")
    }
}

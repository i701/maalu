import SwiftUI

/// The buttons in a map's corner: switch between the map and the earth view, and open the map full screen or close it again.
struct MapButtons: View {
    @Binding var isFullScreen: Bool
    @AppStorage(MapLook.key) private var look = MapLook.map

    var body: some View {
        VStack(spacing: 8) {
            Button(look == .map ? "Earth View" : "Map View", systemImage: look == .map ? "globe.americas.fill" : "map", action: switchLook)
            Button(isFullScreen ? "Close Full Screen" : "Full Screen",
                   systemImage: isFullScreen ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right",
                   action: toggleFullScreen)
        }
        .labelStyle(.iconOnly)
        .buttonStyle(.glass)
        .buttonBorderShape(.circle)
        .padding(10)
    }

    private func switchLook() {
        look = look.other
    }

    private func toggleFullScreen() {
        isFullScreen.toggle()
    }
}

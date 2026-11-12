import SwiftUI

/// Stands in for a screen that is not built yet.
struct ComingSoonView: View {
    let title: String
    let systemImage: String

    var body: some View {
        ContentUnavailableView(title, systemImage: systemImage, description: Text("Not in the iOS app yet."))
            .navigationTitle(title)
    }
}

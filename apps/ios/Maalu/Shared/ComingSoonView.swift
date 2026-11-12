import SwiftUI

struct ComingSoonView: View {
    let title: LocalizedStringResource
    let systemImage: String

    var body: some View {
        ContentUnavailableView {
            Label { Text(title) } icon: { Image(systemName: systemImage) }
        } description: {
            Text("Not in the iOS app yet.")
        }
        .navigationTitle(title)
    }
}

import SwiftUI

/// Which server the app talks to, and signing out.
struct MoreAccountCard: View {
    let server: String
    let onSignOut: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            LabeledContent("Server", value: server)
            Divider()
            Button("Sign out", systemImage: "rectangle.portrait.and.arrow.right", role: .destructive, action: onSignOut)
        }
        .padding(16)
        .card(elevation: 2)
    }
}

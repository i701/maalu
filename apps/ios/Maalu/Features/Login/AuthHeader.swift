import SwiftUI

/// The mark, the headline and the tagline at the top of the server and sign-in screens (the web's words).
struct AuthHeader: View {
    var body: some View {
        VStack(spacing: 8) {
            AppMark()
            Text("Know where your money goes.")
                .font(.title2.weight(.medium))
                .multilineTextAlignment(.center)
            Text("A calm, private place for your accounts, budgets and goals.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 32)
    }
}

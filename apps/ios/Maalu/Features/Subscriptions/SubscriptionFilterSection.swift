import SwiftUI

/// Shown only while a status filter is on, so it is one tap to see everything again.
struct SubscriptionFilterSection: View {
    let status: SubscriptionStatus
    let onClear: () -> Void

    var body: some View {
        Section {
            HStack {
                Label {
                    Text("Showing \(Text(status.title).bold()) only")
                } icon: {
                    Image(systemName: "line.3.horizontal.decrease.circle.fill")
                }
                Spacer()
                Button("Clear", action: onClear)
                    .buttonStyle(.borderless)
            }
        }
    }
}

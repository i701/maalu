import SwiftUI

/// A section's heading: small, uppercase and quiet, so the figures under it lead.
struct SectionTitle: View {
    let text: LocalizedStringResource

    init(_ text: LocalizedStringResource) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.footnote.weight(.semibold))
            .textCase(.uppercase)
            .tracking(0.3)
    }
}

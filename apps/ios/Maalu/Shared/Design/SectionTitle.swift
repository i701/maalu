import SwiftUI

/// A section's heading: small, uppercase and quiet, so the figures under it lead.
struct SectionTitle: View {
    private let text: Text

    init(_ text: LocalizedStringResource) {
        self.text = Text(text)
    }

    /// For a title that comes from data, like a bank's name.
    init(verbatim text: String) {
        self.text = Text(verbatim: text)
    }

    var body: some View {
        text
            .font(.footnote.weight(.semibold))
            .textCase(.uppercase)
            .tracking(0.3)
    }
}

import SwiftUI

struct TagRow: View {
    let tag: TagRecord

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(accent: tag.color))
                .frame(width: 12, height: 12)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 2) {
                Text(tag.name)
                Text(usage)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    /// "12 transactions · 1 template".
    private var usage: AttributedString {
        var text = AttributedString(localized: "^[\(tag.transactionCount) transaction](inflect: true)")
        if tag.templateCount > 0 {
            text += AttributedString(" · ")
            text += AttributedString(localized: "^[\(tag.templateCount) template](inflect: true)")
        }
        return text
    }
}

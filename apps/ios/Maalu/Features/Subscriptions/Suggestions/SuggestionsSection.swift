import SwiftUI

/// Repeating payments found in the history, folded away until opened.
struct SuggestionsSection: View {
    let candidates: [SubscriptionCandidate]
    let onAdd: (SubscriptionCandidate) -> Void
    let onDismiss: (SubscriptionCandidate) -> Void

    var body: some View {
        Section {
            DisclosureGroup {
                ForEach(candidates) { candidate in
                    SuggestionRow(candidate: candidate, onAdd: { onAdd(candidate) }, onDismiss: { onDismiss(candidate) })
                }
            } label: {
                VStack(alignment: .leading) {
                    Label {
                        Text(AttributedString(localized: "^[\(candidates.count) suggested subscription](inflect: true)"))
                    } icon: {
                        Image(systemName: "lightbulb")
                    }
                    Text("Repeating payments found in your history.")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

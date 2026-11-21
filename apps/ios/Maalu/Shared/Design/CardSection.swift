import SwiftUI

/// A titled card of rows with a divider between them, for a page that is a stack of cards instead of a `List`.
struct CardSection<Content: View, Header: View>: View {
    @ViewBuilder let content: Content
    @ViewBuilder let header: Header

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            header
                .foregroundStyle(.secondary)
                .padding(.horizontal, Spacing.card)
            VStack(spacing: 0) {
                Group(subviews: content) { rows in
                    ForEach(rows) { row in
                        row
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, Spacing.card)
                            .padding(.vertical, 12)
                        if row.id != rows.last?.id {
                            Divider().padding(.horizontal, Spacing.card)
                        }
                    }
                }
            }
            .card()
        }
    }
}

extension CardSection where Header == EmptyView {
    init(@ViewBuilder content: () -> Content) {
        self.init(content: content, header: { EmptyView() })
    }
}

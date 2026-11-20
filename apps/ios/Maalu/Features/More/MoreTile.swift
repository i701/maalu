import SwiftUI

/// One place to go from More: a big coloured icon over its name, on a white card.
struct MoreTile: View {
    let item: MoreItem

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Image(systemName: item.systemImage)
                .font(.title)
                .foregroundStyle(item.tint)
            Text(item.title)
                .font(.headline)
                .foregroundStyle(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
        }
        .padding(16)
        .frame(maxWidth: .infinity, minHeight: 104, alignment: .topLeading)
        .card(radius: Radius.card - 4, elevation: 3)
    }
}

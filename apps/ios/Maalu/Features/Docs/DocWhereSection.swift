import SwiftUI

/// Where in the app the guide's feature is.
struct DocWhereSection: View {
    let places: [DocWhere]

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Where to find it")
                .font(.title2)
                .bold()
                .accessibilityAddTraits(.isHeader)
            ForEach(places, id: \.to) { place in
                Label(place.label, systemImage: "arrow.turn.down.right")
            }
        }
        .padding(.top, 8)
    }
}

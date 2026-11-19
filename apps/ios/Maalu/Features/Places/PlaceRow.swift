import SwiftUI

struct PlaceRow: View {
    let place: PlaceTotal
    let currency: String
    let isSelected: Bool

    var body: some View {
        AmountRow {
            VStack(alignment: .leading, spacing: 2) {
                Label(place.label, systemImage: isSelected ? "mappin.circle.fill" : "mappin.circle")
                Text("^[\(place.count) purchase](inflect: true) · last \(day)")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        } amount: {
            MoneyText(place.spentValue, currency: currency)
        }
    }

    private var day: String {
        ISODate.date(place.lastDate)?.formatted(.dateTime.day().month(.abbreviated).year()) ?? place.lastDate
    }
}

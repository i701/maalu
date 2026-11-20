import SwiftUI

/// A Location row: where it happened (or where a vendor usually is), marked on the map, or Add.
struct TransactionLocationSection: View {
    @Binding var location: TransactionLocation?
    var title: LocalizedStringResource = "Location"
    var footer: LocalizedStringResource?
    @State private var isPicking = false

    var body: some View {
        Section {
            Button { isPicking = true } label: {
                LabeledContent {
                    Text(location?.label ?? String(localized: "Add"))
                } label: {
                    Label(String(localized: title), systemImage: location == nil ? "mappin" : "mappin.circle.fill")
                }
            }
            .foregroundStyle(.primary)
        } footer: {
            if let footer { Text(footer) }
        }
        .sheet(isPresented: $isPicking) {
            LocationPickerView(location: location, onSave: setLocation)
        }
    }

    private func setLocation(_ picked: TransactionLocation?) {
        location = picked
    }
}

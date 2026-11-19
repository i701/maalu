import SwiftUI

/// The form's Location row: where it happened, marked on the map, or Add.
struct TransactionLocationSection: View {
    @Bindable var model: TransactionFormModel
    @State private var isPicking = false

    var body: some View {
        Section {
            Button { isPicking = true } label: {
                LabeledContent {
                    Text(model.draft.location?.label ?? String(localized: "Add"))
                } label: {
                    Label("Location", systemImage: model.draft.location == nil ? "mappin" : "mappin.circle.fill")
                }
            }
            .foregroundStyle(.primary)
        }
        .sheet(isPresented: $isPicking) {
            LocationPickerView(location: model.draft.location, onSave: setLocation)
        }
    }

    private func setLocation(_ location: TransactionLocation?) {
        model.draft.location = location
    }
}

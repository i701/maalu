import SwiftUI

struct TransactionDateSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            DatePicker("Date", selection: $model.draft.date, displayedComponents: .date)
                .onChange(of: model.draft.date) { model.dateChanged() }
            Toggle("Planned", isOn: $model.isPlanned)
            TextField("Note", text: $model.draft.note, axis: .vertical)
        } footer: {
            if model.draft.planned {
                Text("Planned: it counts toward nothing until you mark it as paid.")
            }
        }
    }
}

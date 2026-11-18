import SwiftUI

struct TransactionDateSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            DatePicker("Date", selection: $model.draft.date, displayedComponents: .date)
                .onChange(of: model.draft.date) { model.dateChanged() }
            Toggle("Time of day", isOn: $model.hasTime)
            if model.hasTime {
                DatePicker("Time", selection: $model.time, displayedComponents: .hourAndMinute)
            }
            Toggle("Planned", isOn: $model.isPlanned)
            NavigationLink(value: TagsRoute()) {
                LabeledContent("Tags", value: model.draft.tags.isEmpty ? String(localized: "None") : model.draft.tags.formatted(.list(type: .and, width: .narrow)))
            }
            TextField("Note", text: $model.draft.note, axis: .vertical)
        } footer: {
            if model.draft.planned {
                Text("Planned: it counts toward nothing until you mark it as paid.")
            }
        }
    }
}

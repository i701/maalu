import SwiftUI

struct TransactionDateSection: View {
    @Bindable var model: TransactionFormModel

    var body: some View {
        Section {
            DatePicker("Date", selection: $model.draft.date, displayedComponents: .date)
            TextField("Note", text: $model.draft.note, axis: .vertical)
        }
    }
}

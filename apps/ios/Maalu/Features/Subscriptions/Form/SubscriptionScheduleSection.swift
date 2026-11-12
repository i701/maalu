import SwiftUI

struct SubscriptionScheduleSection: View {
    @Bindable var model: SubscriptionFormModel

    var body: some View {
        Section {
            LabeledContent("Every") {
                OptionalIntField("1", value: $model.draft.count).multilineTextAlignment(.trailing)
            }
            Picker("Unit", selection: $model.draft.unit) {
                ForEach(IntervalUnit.allCases) { unit in
                    Text(unit.title).tag(unit)
                }
            }
            .pickerStyle(.segmented)
            DatePicker("First payment", selection: $model.draft.startDate, displayedComponents: .date)
            LabeledContent("Number of payments") {
                OptionalIntField("Goes on", value: $model.draft.installments, maxDigits: 3).multilineTextAlignment(.trailing)
            }
            Picker("Remind me", selection: $model.draft.remind) {
                ForEach(ReminderOption.choices, id: \.self) { days in
                    Text(ReminderOption.title(days)).tag(days)
                }
            }
            if model.isEditing {
                Picker("Status", selection: $model.draft.status) {
                    ForEach(SubscriptionStatus.choosable) { status in
                        Text(status.title).tag(status)
                    }
                }
            }
        } footer: {
            Text("The schedule counts from the first payment. Leave the number of payments empty if it goes on.")
        }
    }
}

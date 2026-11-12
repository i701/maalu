import SwiftUI

struct AccountCardSection: View {
    @Bindable var model: AccountFormModel

    var body: some View {
        Section {
            OptionalIntField("Statement closes on day", value: $model.draft.statementDay)
            OptionalIntField("Payment due on day", value: $model.draft.dueDay)
        } header: {
            Text("Statement")
        } footer: {
            Text("The days of the month, from 1 to 31. Give both, or neither.")
        }
    }
}

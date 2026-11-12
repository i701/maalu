import SwiftUI

struct AccountStatsSection: View {
    @Bindable var model: AccountFormModel

    var body: some View {
        Section {
            Toggle("Leave out of my totals", isOn: $model.draft.excludesFromStats)
            if !model.draft.group.isLiability {
                Toggle("I spend from this account", isOn: $model.draft.spendsFromThis)
            }
        } footer: {
            Text("Totals, reports, budgets and net worth skip an account that is left out. Its own balance and transactions stay.")
        }
    }
}

import SwiftUI

struct MarkPaidForeignSection: View {
    @Bindable var model: MarkPaidFormModel

    var body: some View {
        Section {
            LabeledContent("Rate to \(model.baseCurrency)") {
                DecimalField("0", value: $model.draft.rate)
                    .multilineTextAlignment(.trailing)
                    .disabled(model.draft.charged != nil)
            }
            LabeledContent("Charged in \(model.baseCurrency)") {
                DecimalField("Optional", value: $model.draft.charged).multilineTextAlignment(.trailing)
            }
        } footer: {
            if let cost = model.draft.costInBase {
                Text("Comes to \(MoneyFormat.string(cost, currency: model.baseCurrency)). What it was charged wins over the rate.")
            } else {
                Text("Enter the rate, or what your bank charged in \(model.baseCurrency).")
            }
        }
    }
}

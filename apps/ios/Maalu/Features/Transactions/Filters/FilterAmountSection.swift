import SwiftUI

struct FilterAmountSection: View {
    @Binding var filter: TransactionFilter

    var body: some View {
        Section("Amount") {
            DecimalField("At least", value: $filter.minAmount)
            DecimalField("At most", value: $filter.maxAmount)
        }
    }
}

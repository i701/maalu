import SwiftUI

/// The amount as the big figure of the form, with its currency above it in muted text: the thing you came to enter.
struct BigAmountField: View {
    @Binding var value: Decimal?
    let currency: String
    var isFocused: FocusState<Bool>.Binding

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(currency)
                .font(.footnote.weight(.medium))
                .foregroundStyle(.secondary)
            DecimalField("0", value: $value)
                .font(.largeTitle.weight(.semibold))
                .minimumScaleFactor(0.6)
                .focused(isFocused)
        }
        .padding(.vertical, 6)
    }
}

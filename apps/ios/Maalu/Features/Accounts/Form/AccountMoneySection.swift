import SwiftUI

struct AccountMoneySection: View {
    @Bindable var model: AccountFormModel

    var body: some View {
        Section {
            Picker("Currency", selection: $model.draft.currency) {
                ForEach(model.currencies, id: \.self) { code in
                    Text(code).tag(code)
                }
            }
            if model.isForeign {
                LabeledContent("Rate to \(model.baseCurrency)") {
                    DecimalField("15.42", value: $model.rate).multilineTextAlignment(.trailing)
                }
                if let note = model.rateNote {
                    HStack(spacing: 8) {
                        Text(note)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                        if model.rateLookupFailed {
                            Button("Try again") { retryLookup() }
                                .font(.footnote)
                                .buttonStyle(.borderless)
                        }
                    }
                }
                Toggle("Keep this rate up to date", isOn: $model.draft.autoRate)
            }
            LabeledContent("Opening amount") {
                DecimalField("0", value: $model.draft.opening).multilineTextAlignment(.trailing)
            }
            if model.draft.group.hasCreditLimit {
                LabeledContent("Credit limit") {
                    DecimalField("None", value: $model.draft.creditLimit).multilineTextAlignment(.trailing)
                }
            }
        } footer: {
            if model.isForeign {
                Text("A rate you type is a rate you chose. Turn on the switch to follow the market rate each day.")
            }
        }
    }

    private func retryLookup() {
        model.retryRate()
    }
}

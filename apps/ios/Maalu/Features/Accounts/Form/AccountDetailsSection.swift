import SwiftUI

struct AccountDetailsSection: View {
    @Bindable var model: AccountFormModel

    var body: some View {
        Section {
            TextField("Bank", text: $model.draft.bank)
                .textInputAutocapitalization(.words)
            if !suggestions.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack {
                        ForEach(suggestions, id: \.self) { bank in
                            Button(bank) { model.draft.bank = bank }
                                .buttonStyle(.bordered)
                        }
                    }
                }
            }
            TextField("Account number", text: $model.draft.number)
                .textInputAutocapitalization(.characters)
                .autocorrectionDisabled()
            TextField("Note", text: $model.draft.note, axis: .vertical)
        }
    }

    private var suggestions: [String] {
        let typed = model.draft.bank.trimmingCharacters(in: .whitespaces)
        return model.banks.filter { $0 != typed && (typed.isEmpty || $0.localizedStandardContains(typed)) }.prefix(6).map { $0 }
    }
}

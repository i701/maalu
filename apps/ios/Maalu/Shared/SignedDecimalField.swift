import SwiftUI

/// Like `DecimalField` but a minus sign is allowed, for amounts that can take money away.
struct SignedDecimalField: View {
    let title: LocalizedStringKey
    @Binding var value: Decimal?
    @State private var text: String

    init(_ title: LocalizedStringKey, value: Binding<Decimal?>) {
        self.title = title
        _value = value
        _text = State(initialValue: value.wrappedValue.map { $0.formatted(.number.grouping(.never)) } ?? "")
    }

    var body: some View {
        TextField(title, text: $text)
            .keyboardType(.numbersAndPunctuation)
            .onChange(of: text) {
                let clean = DecimalInput.sanitized(text, allowsSign: true)
                if clean != text { text = clean }
                value = Decimal(string: clean, locale: .current)
            }
    }
}

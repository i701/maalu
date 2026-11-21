import SwiftUI

/// `TextField(value:format:)` only writes its value when editing ends, so Save or Apply tapped straight from the
/// keypad would miss it. This updates the value on every keystroke.
struct DecimalField: View {
    let title: LocalizedStringKey
    @Binding var value: Decimal?
    @State private var text: String
    @State private var lastTyped: Decimal?

    init(_ title: LocalizedStringKey, value: Binding<Decimal?>) {
        self.title = title
        _value = value
        _text = State(initialValue: value.wrappedValue.map(Self.string) ?? "")
        _lastTyped = State(initialValue: value.wrappedValue)
    }

    var body: some View {
        TextField(title, text: $text)
            .keyboardType(.decimalPad)
            .onChange(of: text) {
                let clean = DecimalInput.sanitized(text)
                if clean != text {
                    text = clean
                    return
                }
                lastTyped = Self.parse(text)
                value = lastTyped
            }
            .onChange(of: value) {
                // Only a change from outside (a prefilled rate) rewrites the text; the field's own typing never does.
                if value != lastTyped {
                    lastTyped = value
                    text = value.map(Self.string) ?? ""
                }
            }
    }

    private static func parse(_ text: String) -> Decimal? {
        Decimal(string: text.trimmingCharacters(in: .whitespaces), locale: .current)
    }

    private static func string(_ value: Decimal) -> String {
        value.formatted(.number.grouping(.never))
    }
}

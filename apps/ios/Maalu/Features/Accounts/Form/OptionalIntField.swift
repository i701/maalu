import SwiftUI

/// A whole number that may be empty, such as a statement day.
struct OptionalIntField: View {
    let title: LocalizedStringKey
    let maxDigits: Int
    @Binding var value: Int?
    @State private var text: String

    init(_ title: LocalizedStringKey, value: Binding<Int?>, maxDigits: Int = 2) {
        self.title = title
        self.maxDigits = maxDigits
        _value = value
        _text = State(initialValue: value.wrappedValue.map(String.init) ?? "")
    }

    var body: some View {
        TextField(title, text: $text)
            .keyboardType(.numberPad)
            .onChange(of: text) {
                let digits = String(text.filter { $0.isASCII && $0.isNumber }.prefix(maxDigits))
                if digits != text { text = digits }
                value = Int(digits)
            }
    }
}

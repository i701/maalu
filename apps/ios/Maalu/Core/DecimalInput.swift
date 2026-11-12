import Foundation

enum DecimalInput {
    /// Digits and at most one decimal separator: what an amount can hold, however it got into the field (a paste, a keyboard).
    static func sanitized(_ text: String, separator: Character = Locale.current.decimalSeparator?.first ?? ".") -> String {
        var seenSeparator = false
        return String(text.filter { character in
            if character.isASCII, character.isNumber { return true }
            if character == separator, !seenSeparator {
                seenSeparator = true
                return true
            }
            return false
        })
    }
}

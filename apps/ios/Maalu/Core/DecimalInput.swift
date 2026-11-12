import Foundation

enum DecimalInput {
    /// Digits and at most one decimal separator (and, when allowed, a leading minus): what an amount can hold, however it
    /// got into the field (a paste, a keyboard).
    static func sanitized(_ text: String, separator: Character = Locale.current.decimalSeparator?.first ?? ".", allowsSign: Bool = false) -> String {
        var seenSeparator = false
        var result = ""
        for character in text {
            if character.isASCII, character.isNumber {
                result.append(character)
            } else if character == separator, !seenSeparator {
                seenSeparator = true
                result.append(character)
            } else if allowsSign, character == "-", result.isEmpty {
                result.append(character)
            }
        }
        return result
    }
}

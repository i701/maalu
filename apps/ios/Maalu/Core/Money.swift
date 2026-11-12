import Foundation

enum Money {
    /// The API sends money as a decimal string with a dot, whatever the device's locale.
    static func decimal(_ text: String) -> Decimal? {
        Decimal(string: text, locale: Locale(identifier: "en_US_POSIX"))
    }
}

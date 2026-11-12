import Foundation

/// The API's calendar dates (`2026-11-12`), read and written in the device's time zone.
enum ISODate {
    private static var style: Date.ISO8601FormatStyle {
        Date.ISO8601FormatStyle(timeZone: .current).year().month().day()
    }

    static func string(_ date: Date) -> String {
        date.formatted(style)
    }

    static func date(_ string: String) -> Date? {
        try? Date(string, strategy: style)
    }
}

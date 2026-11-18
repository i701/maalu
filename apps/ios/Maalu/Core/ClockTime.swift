import Foundation

/// The API's time of day (`14:05`, read back as `14:05:00`), as read on the device's clock.
enum ClockTime {
    static func string(_ date: Date, calendar: Calendar = .current) -> String {
        let parts = calendar.dateComponents([.hour, .minute], from: date)
        let twoDigits = IntegerFormatStyle<Int>.number.precision(.integerLength(2)).grouping(.never)
        return "\((parts.hour ?? 0).formatted(twoDigits)):\((parts.minute ?? 0).formatted(twoDigits))"
    }

    static func date(_ string: String, on day: Date = .now, calendar: Calendar = .current) -> Date? {
        let parts = string.split(separator: ":").compactMap { Int($0) }
        guard parts.count >= 2 else { return nil }
        return calendar.date(bySettingHour: parts[0], minute: parts[1], second: 0, of: day)
    }
}

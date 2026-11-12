import Foundation

enum ReminderOption {
    /// Days before a payment to be reminded: nil is never, 0 the day itself.
    static let choices: [Int?] = [nil, 0, 1, 2, 3, 5, 7, 14, 30]

    static func title(_ days: Int?) -> String {
        switch days {
        case nil: String(localized: "Never")
        case 0: String(localized: "On the day")
        case 1: String(localized: "1 day before")
        case 7: String(localized: "A week before")
        case 14: String(localized: "2 weeks before")
        case 30: String(localized: "A month before")
        case let days?: String(localized: "\(days) days before")
        }
    }
}

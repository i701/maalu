import SwiftUI

extension Color {
    /// The API's accent names (categories and tags) as system colours.
    init(accent name: String?) {
        switch name {
        case "blue": self = .blue
        case "green": self = .green
        case "orange": self = .orange
        case "violet": self = .purple
        case "pink": self = .pink
        case "amber": self = .yellow
        case "lime": self = .mint
        default: self = .gray
        }
    }
}

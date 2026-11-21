import SwiftUI

/// The colours of a meter's pieces, by rank: a clear change of hue at every step, biggest share first. The same palette as the Context meter, Traffic and Arc ring blocks by Bencho (MIT, bencho.dev).
enum MeterPalette {
    private static let ranked: [Color] = [
        Color(red: 0x3D / 255, green: 0x7B / 255, blue: 0xFF / 255),
        Color(red: 0xD7 / 255, green: 0x7B / 255, blue: 0xF2 / 255),
        Color(red: 0xFF / 255, green: 0x7A / 255, blue: 0x1A / 255),
        Color(red: 0xFF / 255, green: 0xBE / 255, blue: 0x1A / 255),
        Color(red: 0x34 / 255, green: 0xC7 / 255, blue: 0x59 / 255),
        Color(red: 0xFF / 255, green: 0x5C / 255, blue: 0x8A / 255),
    ]

    /// The colour of the piece at this rank; what is left over (the "Other" piece) is a quiet grey.
    static func color(rank: Int, isRemainder: Bool = false) -> Color {
        isRemainder ? Color(.systemGray3) : ranked[rank % ranked.count]
    }
}

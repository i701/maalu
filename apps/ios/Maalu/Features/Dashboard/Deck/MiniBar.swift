import Foundation

/// One bar of the small chart beside a donut: a short label, its value, and whether it is the one the section is about.
struct MiniBar: Identifiable {
    let label: String
    let value: Double
    var isHighlighted = false

    var id: String { label }
}

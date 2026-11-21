import SwiftUI

/// One part of a donut: its name, its share of the whole (0 to 1) and the amount it stands for.
struct DonutPart {
    let title: LocalizedStringKey
    let share: Double
    let amount: Decimal
}

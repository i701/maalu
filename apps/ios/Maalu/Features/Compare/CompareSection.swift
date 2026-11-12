import SwiftUI

/// A compare table: every row of one group, with the same name, amounts and movement.
struct CompareSection: View {
    let title: LocalizedStringResource
    let rows: [CompareRow]
    let currency: String
    let goodWhenUp: Bool

    var body: some View {
        Section(String(localized: title)) {
            ForEach(rows) { row in
                CompareChangeRow(row: row, currency: currency, goodWhenUp: goodWhenUp)
            }
        }
    }
}

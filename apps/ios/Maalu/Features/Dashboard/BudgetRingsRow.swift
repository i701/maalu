import SwiftUI

/// The budget's limits as rings, four across.
struct BudgetRingsRow: View {
    let lines: [BudgetLine]
    let currency: String

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8, alignment: .top), count: 4)

    var body: some View {
        LazyVGrid(columns: columns, spacing: 16) {
            ForEach(lines) { line in
                BudgetRing(line: line, currency: currency)
            }
        }
        .padding(.vertical, 6)
    }
}

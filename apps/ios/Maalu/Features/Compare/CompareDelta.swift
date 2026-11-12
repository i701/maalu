import SwiftUI

/// How far a figure moved: an arrow, the amount and how much of before that is — green when the
/// move is good news, red when it is not, and a word for the ones that appeared or went away.
struct CompareDelta: View {
    let change: CompareChange
    let currency: String
    let goodWhenUp: Bool
    let state: CompareRow.State

    var body: some View {
        let moved = change.change
        if moved == 0 {
            Text("No change")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        } else {
            let up = moved > 0
            HStack(spacing: 4) {
                Image(systemName: up ? "arrow.up" : "arrow.down")
                Text("\(MoneyFormat.string(abs(moved), currency: currency))\(detail)")
            }
            .font(.subheadline)
            .monospacedDigit()
            .foregroundStyle(up == goodWhenUp ? Color.green : Color.red)
        }
    }

    private var detail: String {
        switch state {
        case .new: String(localized: " · new")
        case .gone: String(localized: " · none now")
        case .both: change.percentText.map { " · \($0)" } ?? ""
        }
    }
}

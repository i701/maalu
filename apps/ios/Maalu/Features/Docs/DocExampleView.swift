import SwiftUI

/// A worked example: a small table, and a note under it.
struct DocExampleView: View {
    let title: String
    let rows: [[String]]
    let note: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(DocText.attributed(title)).bold()
            Grid(alignment: .leadingFirstTextBaseline, horizontalSpacing: 12, verticalSpacing: 6) {
                ForEach(rows, id: \.self) { row in
                    GridRow {
                        ForEach(row, id: \.self) { cell in
                            Text(DocText.attributed(cell))
                        }
                    }
                    Divider()
                }
            }
            if let note {
                Text(DocText.attributed(note))
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(.fill.quaternary, in: .rect(cornerRadius: 12))
    }
}

import SwiftUI

/// The category in quiet grey text behind a small dot of its colour, which is where a row's colour comes from.
struct TransactionCategoryLabel: View {
    let text: String
    let tint: Color

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(tint)
                .frame(width: 7, height: 7)
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
    }
}

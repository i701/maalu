import SwiftUI

/// One cell of the Trends table: a figure, shaded by how big it is, or a heading.
struct TrendCell: View {
    static let height = 38.0

    let text: String
    var width = 76.0
    var tint = Color.clear
    var shade = 0.0
    var isHeader = false
    var isBold = false

    var body: some View {
        Text(text)
            .numericFont()
            .font(.footnote)
            .fontWeight(isBold ? .semibold : .regular)
            .foregroundStyle(isHeader ? Color.secondary : Color.primary)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(width: width - 2, height: Self.height - 2)
            .background(tint.opacity(0.6 * shade), in: .rect(cornerRadius: 6))
            .frame(width: width, height: Self.height)
    }
}

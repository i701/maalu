import SwiftUI

struct CategoryRow: View {
    let category: Category

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color(accent: category.color))
                .frame(width: 12, height: 12)
            VStack(alignment: .leading) {
                Text(category.path)
                Text(category.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

import SwiftUI

/// One of the less common actions, as a row with a coloured icon.
struct TransactionActionRow: View {
    let title: String
    let systemImage: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label { Text(title).foregroundStyle(.primary) } icon: { Image(systemName: systemImage).foregroundStyle(tint) }
        }
    }
}

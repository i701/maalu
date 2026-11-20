import SwiftUI

/// The statement's state as a small label; the words carry it, the colour only backs it up.
struct StatementChip: View {
    let label: String
    let tone: CardStatementText.Tone

    var body: some View {
        Text(label)
            .font(.caption.weight(.semibold))
            .textCase(nil)
            .padding(.horizontal, 8)
            .padding(.vertical, 2)
            .foregroundStyle(color)
            .background(color.opacity(0.15), in: Capsule())
    }

    private var color: Color {
        switch tone {
        case .ok: .blue
        case .warn: .orange
        case .late: .red
        case .quiet: .secondary
        }
    }
}

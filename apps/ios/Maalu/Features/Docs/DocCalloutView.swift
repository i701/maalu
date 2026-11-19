import SwiftUI

/// A tip, note or warning, set apart from the text around it.
struct DocCalloutView: View {
    let tone: String
    let title: String?
    let text: String

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 10) {
            Image(systemName: symbol)
                .foregroundStyle(color)
                .accessibilityHidden(true)
            VStack(alignment: .leading, spacing: 4) {
                if let title {
                    Text(DocText.attributed(title)).bold()
                }
                Text(DocText.attributed(text))
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(color.opacity(0.12), in: .rect(cornerRadius: 12))
        .accessibilityElement(children: .combine)
    }

    private var symbol: String {
        switch tone {
        case "tip": "lightbulb"
        case "warning": "exclamationmark.triangle"
        default: "info.circle"
        }
    }

    private var color: Color {
        switch tone {
        case "tip": .green
        case "warning": .orange
        default: .blue
        }
    }
}

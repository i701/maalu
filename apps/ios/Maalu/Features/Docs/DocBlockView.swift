import SwiftUI

struct DocBlockView: View {
    let block: DocBlock

    var body: some View {
        switch block {
        case .heading(let id, let text):
            Text(DocText.attributed(text))
                .font(.title2)
                .bold()
                .padding(.top, 8)
                .accessibilityAddTraits(.isHeader)
                .id(id)
        case .paragraph(let text):
            Text(DocText.attributed(text))
        case .steps(let items):
            VStack(alignment: .leading, spacing: 8) {
                // the web's guide test keeps every item's text unique within its block
                ForEach(Array(items.enumerated()), id: \.element) { number, item in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("\(number + 1).").monospacedDigit().foregroundStyle(.secondary)
                        Text(DocText.attributed(item))
                    }
                }
            }
        case .list(let items):
            VStack(alignment: .leading, spacing: 8) {
                ForEach(items, id: \.self) { item in
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text("•").foregroundStyle(.secondary).accessibilityHidden(true)
                        Text(DocText.attributed(item))
                    }
                }
            }
        case .callout(let tone, let title, let text):
            DocCalloutView(tone: tone, title: title, text: text)
        case .example(let title, let rows, let note):
            DocExampleView(title: title, rows: rows, note: note)
        case .faq(let questions):
            VStack(alignment: .leading, spacing: 12) {
                ForEach(questions, id: \.q) { question in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(DocText.attributed(question.q)).bold()
                        Text(DocText.attributed(question.a))
                    }
                }
            }
        case .other:
            EmptyView()
        }
    }
}

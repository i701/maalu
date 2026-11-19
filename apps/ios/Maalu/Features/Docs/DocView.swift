import SwiftUI

/// One guide, drawn with native views. A link to another guide opens it here; a link to a page of the app shows as bold words.
struct DocView: View {
    let doc: Doc
    let sectionID: String?
    let docs: [Doc]
    @State private var linked: Doc?

    var body: some View {
        ScrollViewReader { reader in
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text(DocText.attributed(doc.summary))
                        .font(.title3)
                        .foregroundStyle(.secondary)
                    if doc.webOnly == true {
                        DocCalloutView(tone: "note", title: nil, text: "This is about something done on the web: open Maalu in a browser for it.")
                    }
                    ForEach(doc.blocks) { block in
                        DocBlockView(block: block)
                    }
                    if let extras = doc.extras, !extras.isEmpty {
                        DocCalloutView(tone: "note", title: "On the web", text: "The web's version also has: \(extras.joined(separator: "; ")).")
                    }
                    if !doc.where.isEmpty {
                        DocWhereSection(places: doc.where)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding()
            }
            .task { scroll(reader) }
        }
        .environment(\.openURL, OpenURLAction(handler: open))
        .navigationTitle(doc.title)
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(item: $linked) { doc in
            DocView(doc: doc, sectionID: nil, docs: docs)
        }
    }

    private func scroll(_ reader: ScrollViewProxy) {
        guard let sectionID else { return }
        reader.scrollTo(sectionID, anchor: .top)
    }

    private func open(_ url: URL) -> OpenURLAction.Result {
        guard url.scheme == DocText.guideScheme else { return .systemAction }
        linked = docs.first { $0.slug == url.absoluteString.dropFirst(DocText.guideScheme.count + 1) }
        return .handled
    }
}

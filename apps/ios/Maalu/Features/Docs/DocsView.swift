import SwiftUI

/// The in-app guides: what each feature is and how to use it, searchable.
struct DocsView: View {
    private let docs = DocLibrary.bundled
    @State private var search = ""

    private var hits: [DocHit] { DocSearch.search(docs, for: search) }

    var body: some View {
        List(hits) { hit in
            NavigationLink(value: DocRoute(slug: hit.doc.slug, sectionID: hit.sectionID)) {
                VStack(alignment: .leading, spacing: 4) {
                    Label {
                        Text(hit.doc.title)
                    } icon: {
                        Image(systemName: "book.pages").foregroundStyle(Color(accent: hit.doc.accent))
                    }
                    if let snippet = hit.snippet {
                        if let section = hit.sectionTitle {
                            Text(section).font(.subheadline).bold()
                        }
                        Text(snippet).font(.subheadline).foregroundStyle(.secondary)
                    } else {
                        Text(DocText.plain(hit.doc.summary)).font(.subheadline).foregroundStyle(.secondary)
                    }
                }
            }
        }
        .overlay {
            if docs.isEmpty {
                ContentUnavailableView("No guides", systemImage: "book", description: Text("The guides are missing from this build of the app."))
            } else if hits.isEmpty {
                ContentUnavailableView.search(text: search)
            }
        }
        .gradientHeader(.brand)
        .navigationTitle("Guides")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $search, prompt: "Search the guides")
        .navigationDestination(for: DocRoute.self) { route in
            if let doc = docs.first(where: { $0.slug == route.slug }) {
                DocView(doc: doc, sectionID: route.sectionID, docs: docs)
            }
        }
    }
}

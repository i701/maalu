/// A guide that matched a search, and where: the section and a passage from the body when the words were found there rather than only in the title or summary.
struct DocHit: Identifiable, Hashable {
    let doc: Doc
    let sectionID: String?
    let sectionTitle: String?
    let snippet: String?

    var id: String { doc.slug }
}

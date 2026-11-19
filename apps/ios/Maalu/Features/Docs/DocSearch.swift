import Foundation

/// The web's guide search (`lib/docs/search.ts`), so a search finds the same guides in the same order.
enum DocSearch {
    private static let snippetLength = 160

    private struct Passage {
        let sectionID: String?
        let sectionTitle: String?
        let text: String
        let folded: String
    }

    /// The guides that contain every word of `query` (in any order, ignoring case and formatting), best first: words in the title count most,
    /// then the summary, then how often the body mentions them. Ties keep the guides' own order. An empty query returns every guide.
    static func search(_ docs: [Doc], for query: String) -> [DocHit] {
        let words = DocText.plain(query).lowercased().split(whereSeparator: \.isWhitespace).map(String.init)
        guard !words.isEmpty else { return docs.map { DocHit(doc: $0, sectionID: nil, sectionTitle: nil, snippet: nil) } }

        var hits: [(hit: DocHit, score: Int)] = []
        for doc in docs {
            let title = DocText.plain(doc.title).lowercased()
            let summary = DocText.plain(doc.summary).lowercased()
            var section: (id: String, title: String)?
            var passages: [Passage] = []
            for block in doc.blocks {
                if case .heading(let id, let text) = block { section = (id, text) }
                for text in block.texts {
                    let shown = DocText.plain(text)
                    passages.append(Passage(sectionID: section?.id, sectionTitle: section?.title, text: shown, folded: shown.lowercased()))
                }
            }
            let everything = ([title, summary] + passages.map(\.folded)).joined(separator: "\n")
            guard words.allSatisfy({ everything.contains($0) }) else { continue }

            let inBody = passages.filter { passage in words.contains { passage.folded.contains($0) } }
            let score = words.filter { title.contains($0) }.count * 10 + words.filter { summary.contains($0) }.count * 3 + inBody.count
            // point at the body only when the title and summary alone don't explain the match
            let headerHasAll = words.allSatisfy { title.contains($0) || summary.contains($0) }
            let count = { (passage: Passage) in words.filter { passage.folded.contains($0) }.count }
            let best = headerHasAll ? nil : inBody.reduce(nil as Passage?) { top, passage in
                guard let top else { return passage }
                return count(passage) > count(top) ? passage : top
            }
            let snippet = best.map { passage in
                let first = words.compactMap { passage.folded.range(of: $0)?.lowerBound }.min() ?? passage.folded.startIndex
                return excerpt(passage.text, at: passage.folded.distance(from: passage.folded.startIndex, to: first))
            }
            hits.append((DocHit(doc: doc, sectionID: best?.sectionID, sectionTitle: best?.sectionTitle, snippet: snippet), score))
        }
        // a stable sort, so equal scores keep the guides' order
        return hits.enumerated().sorted { ($0.element.score, -$0.offset) > ($1.element.score, -$1.offset) }.map(\.element.hit)
    }

    /// About 160 characters of `text` around character `at`, cut at word boundaries.
    static func excerpt(_ text: String, at: Int) -> String {
        let characters = Array(text)
        guard characters.count > snippetLength else { return text }
        var start = max(0, at - snippetLength / 3)
        if start > 0, let space = characters[start...].firstIndex(of: " ") { start = space + 1 }
        var end = min(characters.count, start + snippetLength)
        if end < characters.count, let space = characters[..<end].lastIndex(of: " "), space > start { end = space }
        let body = String(characters[start..<end]).trimmingCharacters(in: .whitespaces)
        return (start > 0 ? "…" : "") + body + (end < characters.count ? "…" : "")
    }
}

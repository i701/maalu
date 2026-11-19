import Foundation
import Testing
@testable import Maalu

/// Read against the real bundled guides, as Android's tests are, so a change to the web's export that breaks the app shows here.
struct DocsTests {
    private let docs = DocLibrary.bundled

    @Test func everyGuideReadsAndEveryLinkToAGuideResolves() throws {
        #expect(docs.count >= 16)
        let slugs = Set(docs.map(\.slug))
        #expect(slugs.count == docs.count)
        for doc in docs {
            #expect(!doc.blocks.contains(.other), "\(doc.slug) has a block the app does not draw")
            #expect(Set(doc.blocks.map(\.id)).count == doc.blocks.count, "\(doc.slug) repeats a block")
            for text in [doc.summary] + doc.blocks.flatMap(\.texts) {
                for match in text.matches(of: /\]\(([^)\s]+)\)/) {
                    if let slug = DocText.guideSlug(String(match.output.1)) {
                        #expect(slugs.contains(slug), "\(doc.slug) links to a missing guide \(slug)")
                    }
                }
            }
        }
    }

    @Test func markupBecomesPlainTextAndGuideLinksStayLinks() {
        #expect(DocText.plain("Open **Accounts** on [the page](/accounts).") == "Open Accounts on the page.")
        #expect(DocText.guideSlug("/docs/tags") == "tags")
        #expect(DocText.guideSlug("/accounts") == nil)
        let text = DocText.attributed("See [Tags](/docs/tags) and [Accounts](/accounts).")
        #expect(text.runs.compactMap(\.link).map(\.absoluteString) == ["maalu-guide:tags"])
        #expect(String(text.characters) == "See Tags and Accounts.")
    }

    @Test func searchNeedsEveryWordAndRanksTheTitleFirst() throws {
        #expect(DocSearch.search(docs, for: "").count == docs.count)
        let tags = DocSearch.search(docs, for: "TAGS")
        #expect(tags.first?.doc.slug == "tags")
        #expect(tags.first?.snippet == nil)
        #expect(DocSearch.search(docs, for: "zzzz nothing").isEmpty)
        let deep = try #require(DocSearch.search(docs, for: "statement due").first)
        #expect(deep.snippet != nil || deep.sectionID == nil)
    }

    @Test func anExcerptIsCutAtWords() {
        let text = String(repeating: "word ", count: 80)
        let cut = DocSearch.excerpt(text, at: 200)
        #expect(cut.hasPrefix("…") && cut.hasSuffix("…"))
        #expect(cut.count <= 164)
        #expect(DocSearch.excerpt("short", at: 0) == "short")
    }
}

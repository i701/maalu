import Foundation

/// A guide's inline markup: `**bold**` and `[label](/page)`, which is Markdown, so the system draws it.
enum DocText {
    /// The scheme a link to another guide is given, so the guide screen can open it in the app.
    static let guideScheme = "maalu-guide"

    // a computed property, as a `Regex` is not `Sendable` and cannot be a shared static
    private static var link: Regex<(Substring, Substring, Substring)> { /\[([^\]]+)\]\(([^)\s]+)\)/ }

    /// The text a reader sees: link markup becomes its label and `**` goes, as the web's `plainText`.
    static func plain(_ text: String) -> String {
        text.replacing(link) { String($0.output.1) }.replacing("**", with: "")
    }

    /// The text with its bold; a link to a guide opens that guide, and a link to a page of the app shows as bold words.
    static func attributed(_ text: String) -> AttributedString {
        let marked = text.replacing(link) { match in
            let label = match.output.1
            if let slug = guideSlug(String(match.output.2)) { return "[\(label)](\(guideScheme):\(slug))" }
            return "**\(label)**"
        }
        let options = AttributedString.MarkdownParsingOptions(interpretedSyntax: .inlineOnlyPreservingWhitespace)
        return (try? AttributedString(markdown: marked, options: options)) ?? AttributedString(plain(text))
    }

    /// "accounts" from "/docs/accounts", or nil for any other page.
    static func guideSlug(_ href: String) -> String? {
        let path = href.split(separator: "?").first.map(String.init) ?? href
        guard let match = path.wholeMatch(of: /\/docs\/([a-z0-9-]+)\/?/) else { return nil }
        return String(match.output.1)
    }
}

import Foundation

/// One block of a guide, as the web's export writes it. Text may hold `**bold**` and `[label](/page)`.
enum DocBlock: Decodable, Hashable, Identifiable {
    case heading(id: String, text: String)
    case paragraph(String)
    case steps([String])
    case list([String])
    case callout(tone: String, title: String?, text: String)
    case example(title: String, rows: [[String]], note: String?)
    case faq([DocQuestion])
    /// A kind this app does not know yet; it is left out.
    case other

    private enum Keys: String, CodingKey {
        case type, id, text, items, tone, title, rows, note, faq
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: Keys.self)
        switch try container.decode(String.self, forKey: .type) {
        case "h2": self = .heading(id: try container.decode(String.self, forKey: .id), text: try container.decode(String.self, forKey: .text))
        case "p": self = .paragraph(try container.decode(String.self, forKey: .text))
        case "steps": self = .steps(try container.decode([String].self, forKey: .items))
        case "list": self = .list(try container.decode([String].self, forKey: .items))
        case "callout":
            self = .callout(tone: try container.decodeIfPresent(String.self, forKey: .tone) ?? "note",
                            title: try container.decodeIfPresent(String.self, forKey: .title),
                            text: try container.decode(String.self, forKey: .text))
        case "example":
            self = .example(title: try container.decode(String.self, forKey: .title),
                            rows: try container.decode([[String]].self, forKey: .rows),
                            note: try container.decodeIfPresent(String.self, forKey: .note))
        case "faq": self = .faq(try container.decode([DocQuestion].self, forKey: .faq))
        default: self = .other
        }
    }

    /// Its text: the web's guide test keeps every block's text unique within a guide (it is the React key there too).
    var id: String { texts.joined(separator: "\n") }

    /// Every piece of readable text in it, for the search.
    var texts: [String] {
        switch self {
        case .heading(_, let text), .paragraph(let text): [text]
        case .steps(let items), .list(let items): items
        case .callout(_, let title, let text): [title, text].compactMap { $0 }
        case .example(let title, let rows, let note): [title] + rows.flatMap { $0 } + [note].compactMap { $0 }
        case .faq(let questions): questions.flatMap { [$0.q, $0.a] }
        case .other: []
        }
    }
}

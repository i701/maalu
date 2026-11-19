/// One in-app guide. The guides are written on the web and exported to `docs.json`, which the app bundles, so they read offline.
struct Doc: Decodable, Identifiable, Hashable {
    let slug: String
    let title: String
    let summary: String
    let accent: String
    let `where`: [DocWhere]
    let blocks: [DocBlock]
    /// What the web's version has that the app leaves out, such as a live example.
    let extras: [String]?
    /// A guide about something only the web does.
    let webOnly: Bool?

    var id: String { slug }
}

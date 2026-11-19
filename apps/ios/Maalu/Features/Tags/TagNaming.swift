/// What the name prompt is for: a new tag, or a new name for one.
enum TagNaming: Identifiable {
    case add
    case rename(TagRecord)

    var id: String {
        switch self {
        case .add: "add"
        case .rename(let tag): "rename-\(tag.id)"
        }
    }

    var tag: TagRecord? {
        if case .rename(let tag) = self { tag } else { nil }
    }
}
